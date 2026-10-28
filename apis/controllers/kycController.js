const KYC = require('../models/KYC');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logActivity } = require('../utils/activityLogger');
const { encryptSecret, decryptSecret } = require('../utils/webhookSecret');

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const decryptOrLegacy = (encrypted, legacy) => {
    if (encrypted) {
        try { return decryptSecret(encrypted); } catch { return ''; }
    }
    return legacy || '';
};
const maskPan = (value) => value ? `XXXXXX${String(value).slice(-5)}` : '';
const maskAadhaar = (value) => value ? `XXXX XXXX ${String(value).slice(-4)}` : '';
const publicKyc = (kyc) => {
    if (!kyc) return { status: 'not_submitted' };
    return {
        _id: kyc._id,
        kycType: kyc.kycType,
        status: kyc.status,
        pan_number_masked: maskPan(decryptOrLegacy(kyc.pan_encrypted, kyc.pan_number)),
        aadhaar_number_masked: maskAadhaar(decryptOrLegacy(kyc.aadhaar_encrypted, kyc.aadhaar_number)),
        gst_number_masked: decryptOrLegacy(kyc.gst_encrypted, kyc.gst_number) ? `XXXXXXXXX${decryptOrLegacy(kyc.gst_encrypted, kyc.gst_number).slice(-3)}` : '',
        rejection_reason: kyc.rejection_reason || '',
        submittedAt: kyc.createdAt,
        reviewedAt: kyc.reviewed_at,
        updatedAt: kyc.updatedAt,
    };
};

// Multer config for KYC docs
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/kyc/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `kyc_${req.user.id}_${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
        if (allowedTypes.has(file.mimetype) && /\.(pdf|jpe?g|png)$/i.test(file.originalname)) cb(null, true);
        else cb(new Error('Only PDF, JPG, PNG files allowed'));
    }
});
exports.uploadMiddleware = upload.fields([
    { name: 'pan_file', maxCount: 1 },
    { name: 'aadhaar_file', maxCount: 1 },
    { name: 'selfie_file', maxCount: 1 },
    { name: 'gst_file', maxCount: 1 },
    { name: 'company_doc_file', maxCount: 1 },
]);

// GET /api/kyc/status
exports.getKYCStatus = async (req, res) => {
    try {
        const kyc = await KYC.findOne({ userId: req.user.id }).select('+pan_encrypted +aadhaar_encrypted +gst_encrypted').lean();
        res.json(publicKyc(kyc));
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// POST /api/kyc/submit
exports.submitKYC = async (req, res) => {
    try {
        const { kycType, pan_number, aadhaar_number, gst_number } = req.body;
        const errors = {};
        const normalizedType = String(kycType || 'individual').toLowerCase();

        if (!['individual', 'business'].includes(normalizedType)) errors.kycType = 'Invalid KYC type';

        if (normalizedType === 'individual' && (!pan_number || !PAN_REGEX.test(String(pan_number).toUpperCase()))) {
            errors.pan_number = 'Invalid PAN number format (e.g. ABCDE1234F)';
        }
        if (normalizedType === 'individual' && (!aadhaar_number || !/^\d{12}$/.test(String(aadhaar_number)))) {
            errors.aadhaar_number = 'Aadhaar must be 12 digits';
        }
        if (normalizedType === 'individual') {
            if (!req.files?.pan_file) errors.pan_file = 'PAN card document is required';
            if (!req.files?.aadhaar_file) errors.aadhaar_file = 'Aadhaar document is required';
            if (!req.files?.selfie_file) errors.selfie_file = 'Selfie is required';
        }
        if (normalizedType === 'business') {
            if (!gst_number || !GST_REGEX.test(String(gst_number).toUpperCase())) errors.gst_number = 'Invalid GST number';
            if (!req.files?.gst_file) errors.gst_file = 'GST certificate is required';
            if (!req.files?.company_doc_file) errors.company_doc_file = 'Company registration document is required';
        }

        if (Object.keys(errors).length) return res.status(422).json({ errors });

        const existing = await KYC.findOne({ userId: req.user.id });
        if (existing && existing.status === 'approved') {
            return res.status(400).json({ msg: 'KYC already approved. No changes allowed.' });
        }

        const kycData = {
            userId: req.user.id,
            kycType: normalizedType,
            pan_number: '',
            aadhaar_number: '',
            gst_number: '',
            pan_encrypted: normalizedType === 'individual' ? encryptSecret(String(pan_number).toUpperCase()) : '',
            aadhaar_encrypted: normalizedType === 'individual' ? encryptSecret(String(aadhaar_number)) : '',
            gst_encrypted: normalizedType === 'business' ? encryptSecret(String(gst_number).toUpperCase()) : '',
            pan_file: req.files.pan_file?.[0]?.path || '',
            aadhaar_file: req.files.aadhaar_file?.[0]?.path || '',
            selfie_file: req.files.selfie_file?.[0]?.path || '',
            gst_file: req.files.gst_file?.[0]?.path || '',
            company_doc_file: req.files.company_doc_file?.[0]?.path || '',
            status: 'pending',
            rejection_reason: '',
        };

        if (existing) {
            Object.assign(existing, kycData);
            await existing.save();
        } else {
            await KYC.create(kycData);
        }

        // Update user kycStatus
        await User.findByIdAndUpdate(req.user.id, { kycStatus: 'pending' });

        logActivity({
            userId: req.user.id,
            type: "USER_ACTIVITY",
            action: "KYC_SUBMITTED",
            description: `KYC submitted (${kycType || 'individual'})`,
            resourceType: "KYC",
            req,
        });

        const saved = await KYC.findOne({ userId: req.user.id }).select('+pan_encrypted +aadhaar_encrypted +gst_encrypted').lean();
        res.json({ msg: 'KYC submitted successfully. Under review.', kyc: publicKyc(saved) });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};
