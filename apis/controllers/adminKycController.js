const KYC = require('../models/KYC');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { logActivity } = require('../utils/activityLogger');
const { decryptSecret } = require('../utils/webhookSecret');

const decryptOrLegacy = (encrypted, legacy) => {
    if (encrypted) {
        try { return decryptSecret(encrypted); } catch { return ''; }
    }
    return legacy || '';
};

const safeKyc = (kyc) => ({
    _id: kyc._id,
    userId: kyc.userId,
    kycType: kyc.kycType,
    panMasked: decryptOrLegacy(kyc.pan_encrypted, kyc.pan_number) ? `XXXXXX${decryptOrLegacy(kyc.pan_encrypted, kyc.pan_number).slice(-5)}` : '',
    aadhaarMasked: decryptOrLegacy(kyc.aadhaar_encrypted, kyc.aadhaar_number) ? `XXXX XXXX ${decryptOrLegacy(kyc.aadhaar_encrypted, kyc.aadhaar_number).slice(-4)}` : '',
    gstMasked: decryptOrLegacy(kyc.gst_encrypted, kyc.gst_number) ? `XXXXXXXXXXXX${decryptOrLegacy(kyc.gst_encrypted, kyc.gst_number).slice(-3)}` : '',
    documentsPresent: ['pan_file', 'aadhaar_file', 'selfie_file', 'gst_file', 'company_doc_file'].filter((field) => Boolean(kyc[field])),
    status: kyc.status,
    rejection_reason: kyc.rejection_reason || '',
    createdAt: kyc.createdAt,
    updatedAt: kyc.updatedAt,
    reviewed_at: kyc.reviewed_at,
});

const MAX_PAGE_SIZE = 100;

exports.listKyc = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));

        const filter = {};
        if (req.query.status && ['pending', 'approved', 'rejected', 'not_submitted'].includes(req.query.status)) {
            filter.status = req.query.status;
        }

        if (req.query.dateFrom || req.query.dateTo) {
            filter.createdAt = {};
            if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) {
                const end = new Date(req.query.dateTo);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        // Search (name/email/company/mobile) and accountType filter both live
        // on User, not KYC, so resolve matching user ids first.
        const search = String(req.query.search || '').trim().slice(0, 100);
        if (search || req.query.accountType) {
            const userMatch = { role: { $ne: 'superadmin' } };
            if (search) {
                const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                userMatch.$or = [
                    { first_name: regex },
                    { last_name: regex },
                    { email: regex },
                    { mobile_number: regex },
                    { company_name: regex },
                ];
            }
            if (req.query.accountType && ['individual', 'corporate'].includes(req.query.accountType)) {
                userMatch.accountType = req.query.accountType;
            }
            const matchingUsers = await User.find(userMatch).select('_id').lean();
            filter.userId = { $in: matchingUsers.map((user) => user._id) };
        }

        const [records, total] = await Promise.all([
            KYC.find(filter)
                .select('+pan_encrypted +aadhaar_encrypted +gst_encrypted')
                .populate('userId', 'first_name last_name email mobile_number company_name accountType')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            KYC.countDocuments(filter),
        ]);

        return res.json({
            kyc: records.map((record) => ({
                ...safeKyc(record),
                merchant: record.userId ? {
                    _id: record.userId._id,
                    first_name: record.userId.first_name,
                    last_name: record.userId.last_name,
                    email: record.userId.email,
                    mobile_number: record.userId.mobile_number,
                    company_name: record.userId.company_name,
                    accountType: record.userId.accountType,
                } : null,
            })),
            total,
            page,
            limit,
        });
    } catch (error) {
        return res.status(500).json({ msg: 'Failed to load KYC records', requestId: req.requestId });
    }
};

exports.reviewKyc = async (req, res) => {
    const { status, rejection_reason = '' } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ msg: 'Status must be approved or rejected' });
    if (status === 'rejected' && !String(rejection_reason).trim()) return res.status(422).json({ msg: 'Rejection reason is required' });

    try {
        const kyc = await KYC.findById(req.params.id);
        if (!kyc) return res.status(404).json({ msg: 'KYC record not found' });
        if (kyc.status !== 'pending') return res.status(400).json({ msg: 'Only pending KYC records can be reviewed' });

        kyc.status = status;
        kyc.rejection_reason = status === 'rejected' ? String(rejection_reason).trim().slice(0, 500) : '';
        kyc.reviewed_by = req.user.id;
        kyc.reviewed_at = new Date();
        await kyc.save();
        await User.findByIdAndUpdate(kyc.userId, { kycStatus: status === 'approved' ? 'verified' : 'rejected' });
        logActivity({ userId: kyc.userId, type: 'USER_ACTIVITY', action: status === 'approved' ? 'KYC_APPROVED' : 'KYC_REJECTED', description: `KYC ${status}`, resourceType: 'KYC', resourceId: kyc._id, req, metadata: { reviewedBy: req.user.id } });
        return res.json({ msg: `KYC ${status}`, kyc: safeKyc(kyc.toObject()) });
    } catch (error) {
        return res.status(500).json({ msg: 'Failed to review KYC', requestId: req.requestId });
    }
};

exports.getDocument = async (req, res) => {
    const allowedFields = new Set(['pan_file', 'aadhaar_file', 'selfie_file', 'gst_file', 'company_doc_file']);
    if (!allowedFields.has(req.params.field)) return res.status(400).json({ msg: 'Invalid KYC document' });
    try {
        const kyc = await KYC.findById(req.params.id).select(req.params.field).lean();
        const storedPath = kyc?.[req.params.field];
        if (!storedPath) return res.status(404).json({ msg: 'KYC document not found' });
        const resolved = path.resolve(storedPath);
        const kycRoot = path.resolve('uploads/kyc');
        if (!resolved.startsWith(`${kycRoot}${path.sep}`) || !fs.existsSync(resolved)) return res.status(404).json({ msg: 'KYC document not found' });
        return res.sendFile(resolved);
    } catch (error) {
        return res.status(500).json({ msg: 'Failed to load KYC document', requestId: req.requestId });
    }
};