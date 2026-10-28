const mongoose = require('mongoose');
const BulkPayoutBatch = require('../models/BulkPayoutBatch');
const Wallet = require('../models/Wallet');

const { parseCsv, toCsv } = require('../utils/csv');
const { validateBulkRows } = require('../services/bulkPayoutValidator');
const payoutEngine = require('../services/payoutEngine');
const { maskAccountNumber } = require('../utils/mask');
const logger = require('../utils/logger');
const payoutQueue = require('../queues/payoutQueue');
const { REQUIRED_COLUMNS } = require('../services/bulkPayoutValidator');
const { recordPayoutResult } = require('../services/bulkPayoutBatchService');
const { logActivity } = require('../utils/activityLogger');

const maskValidationRows = (rows) => rows.map(({ account_number, ...row }) => ({
    ...row,
    account_number_last4: maskAccountNumber(account_number).slice(-4),
}));

const TEMPLATE_HEADERS = ['beneficiary_name', 'account_number', 'ifsc_code', 'bank_name', 'amount', 'remarks'];
const TEMPLATE_SAMPLE_ROWS = [
    {
        beneficiary_name: 'Rahul Sharma',
        account_number: '123456789012',
        ifsc_code: 'HDFC0001234',
        bank_name: 'HDFC Bank',
        amount: '5000',
        remarks: 'Vendor payment',
    },
];

/**
 * GET /api/payouts/bulk/template - downloadable CSV template.
 */
exports.downloadTemplate = async (req, res) => {
    const csv = toCsv(TEMPLATE_HEADERS, TEMPLATE_SAMPLE_ROWS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_payout_template.csv"');
    return res.send(csv);
};

/**
 * POST /api/payouts/bulk/validate - upload + preview only. Never persists
 * anything or moves money; purely a preview so the merchant can see
 * valid/invalid rows, totals, and remaining balance before committing.
 */
exports.validateBulkFile = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        if (!req.file) {
            return res.status(400).json({ msg: 'CSV file is required' });
        }

        const text = req.file.buffer.toString('utf-8');
        const { headers, rows } = parseCsv(text);

        if (rows.length === 0) {
            return res.status(400).json({ msg: 'CSV file has no data rows' });
        }

        const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
        if (missingColumns.length > 0) {
            return res.status(400).json({ msg: `Missing required CSV columns: ${missingColumns.join(', ')}` });
        }

        const wallet = await Wallet.findOne({ userId }).lean();
        const availableBalance = Number(wallet?.availableBalance || 0);

        const result = validateBulkRows(rows, availableBalance);

        return res.json({
            success: true,
            fileName: req.file.originalname,
            ...result,
            valid: maskValidationRows(result.valid),
            invalid: maskValidationRows(result.invalid),
        });
    } catch (error) {
        console.error('validateBulkFile:', error);
        return res.status(500).json({ msg: 'Failed to validate CSV file', requestId: req.requestId });
    }
};

/**
 * POST /api/payouts/bulk - atomically reserves a validated batch and queues
 * each reserved payout for the existing payout worker.
 *
 * Guarded by the standard idempotency middleware at the route level (so
 * double-clicking "Create Batch" with the same Idempotency-Key does not
 * create two batches); each individual row additionally gets its own
 * internal idempotency claim keyed off the batch id + row index, so even
 * if this handler were somehow invoked twice for the same batch, no row
 * would be paid out twice.
 */
exports.createBulkPayout = async (req, res) => {
    const { idempotency } = req;

    try {
        const userId = req.user.id || req.user._id;

        if (!req.file) {
            return idempotency.fail(res, 400, { msg: 'CSV file is required' });
        }

        const text = req.file.buffer.toString('utf-8');
        const { headers, rows } = parseCsv(text);

        if (rows.length === 0) {
            return idempotency.fail(res, 400, { msg: 'CSV file has no data rows' });
        }

        const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
        if (missingColumns.length > 0) {
            return idempotency.fail(res, 400, { msg: `Missing required CSV columns: ${missingColumns.join(', ')}` });
        }

        const wallet = await Wallet.findOne({ userId }).lean();
        const availableBalance = Number(wallet?.availableBalance || 0);

        const { valid, invalid, totalAmount, insufficientBalance, rowLimitExceeded, maxRows } =
            validateBulkRows(rows, availableBalance);

        if (rowLimitExceeded) {
            return idempotency.fail(res, 400, { msg: `CSV exceeds the maximum of ${maxRows} rows` });
        }

        if (valid.length === 0) {
            return idempotency.fail(res, 400, { msg: 'No valid rows to process', invalid });
        }

        if (insufficientBalance) {
            return idempotency.fail(res, 400, {
                msg: `Insufficient wallet balance: total ₹${totalAmount} exceeds available ₹${availableBalance}`,
                totalAmount,
                availableBalance,
            });
        }

        let batch;
        const payouts = [];
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                [batch] = await BulkPayoutBatch.create([{
                    userId,
                    fileName: req.file.originalname,
                    totalRows: rows.length,
                    validRows: valid.length,
                    invalidRows: invalid.length,
                    totalAmount,
                    processingCount: valid.length,
                    status: 'processing',
                    results: [],
                }], { session });

                for (const row of valid) {
                    const prepared = await payoutEngine.reservePayoutForProcessing({
                        userId,
                        amount: row.amount,
                        beneficiary_name: row.beneficiary_name,
                        account_number: row.account_number,
                        ifsc_code: row.ifsc_code,
                        bank_name: row.bank_name,
                        extra: { batchId: batch._id, remarks: row.remarks || '' },
                        session,
                    });
                    payouts.push(prepared.payout);
                    batch.results.push({
                        rowIndex: row.rowIndex,
                        beneficiary_name: row.beneficiary_name,
                        account_number_last4: maskAccountNumber(row.account_number).slice(-4),
                        amount: row.amount,
                        status: 'processing',
                        message: 'Queued for provider processing',
                        payoutId: prepared.payout._id,
                    });
                }

                await batch.save({ session });
            });
        } catch (error) {
            if (error.message === 'Insufficient wallet balance') {
                return idempotency.fail(res, 400, { msg: error.message, totalAmount, availableBalance });
            }
            throw error;
        } finally {
            await session.endSession();
        }

        let enqueuedCount = 0;
        try {
            for (const payout of payouts) {
                await payoutQueue.add('process-payout', { payoutId: payout._id.toString() }, {
                    jobId: `bulk-${payout._id.toString()}`,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: true,
                    removeOnFail: false,
                });
                enqueuedCount += 1;
            }
        } catch (queueError) {
            logger.error('bulkPayout.enqueueFailed', { batchId: batch._id.toString(), error: queueError.message });
            for (const payout of payouts.slice(enqueuedCount)) {
                try {
                    const failed = await payoutEngine.applyProviderResult({
                        payout,
                        providerResult: { status: 'FAILED', message: 'Bulk processing queue unavailable' },
                    });
                    await recordPayoutResult({
                        payoutId: failed._id,
                        status: failed.status,
                        message: failed.remarks,
                    });
                } catch (releaseError) {
                    logger.error('bulkPayout.queueReleaseFailed', {
                        payoutId: payout._id.toString(),
                        error: releaseError.message,
                    });
                }
            }
            batch = await BulkPayoutBatch.findById(batch._id).lean();

            logActivity({
                userId,
                type: "USER_ACTIVITY",
                action: "BULK_PAYOUT_SUBMITTED",
                description: `Bulk payout submitted (${batch.validRows} rows, some could not be queued)`,
                resourceType: "BULK_PAYOUT_BATCH",
                resourceId: batch._id,
                req,
                metadata: { totalAmount: batch.totalAmount, validRows: batch.validRows, invalidRows: batch.invalidRows },
            });

            return idempotency.complete(res, 202, {
                success: true,
                msg: 'Bulk payout submitted; some rows could not be queued and were released safely',
                batch,
                invalid: maskValidationRows(invalid),
            }, batch._id.toString());
        }

        logActivity({
            userId,
            type: "USER_ACTIVITY",
            action: "BULK_PAYOUT_SUBMITTED",
            description: `Bulk payout submitted (${batch.validRows} rows)`,
            resourceType: "BULK_PAYOUT_BATCH",
            resourceId: batch._id,
            req,
            metadata: { totalAmount: batch.totalAmount, validRows: batch.validRows, invalidRows: batch.invalidRows },
        });

        const responseBody = { success: true, msg: 'Bulk payout submitted for processing', batch, invalid: maskValidationRows(invalid) };
        return idempotency.complete(res, 202, responseBody, batch._id.toString());
    } catch (error) {
        console.error('createBulkPayout:', error);
        if (idempotency) {
            return idempotency.fail(res, 500, { msg: 'Failed to process bulk payout' });
        }
        return res.status(500).json({ msg: 'Failed to process bulk payout', requestId: req.requestId });
    }
};

/**
 * GET /api/payouts/bulk - list own batches, paginated.
 */
exports.getBulkBatches = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

        const [batches, total] = await Promise.all([
            BulkPayoutBatch.find({ userId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select('-results')
                .lean(),
            BulkPayoutBatch.countDocuments({ userId }),
        ]);

        return res.json({ success: true, batches, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) {
        console.error('getBulkBatches:', error);
        return res.status(500).json({ msg: 'Failed to load bulk payout batches', requestId: req.requestId });
    }
};

/**
 * GET /api/payouts/bulk/:id - own batch detail, including per-row results.
 */
exports.getBulkBatchById = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const batch = await BulkPayoutBatch.findOne({ _id: req.params.id, userId }).lean();

        if (!batch) {
            return res.status(404).json({ msg: 'Batch not found' });
        }

        return res.json({ success: true, batch });
    } catch (error) {
        console.error('getBulkBatchById:', error);
        return res.status(500).json({ msg: 'Failed to load batch', requestId: req.requestId });
    }
};
