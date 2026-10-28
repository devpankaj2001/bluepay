const BulkPayoutBatch = require('../models/BulkPayoutBatch');

const COUNT_FIELDS = {
    success: 'successCount',
    failed: 'failedCount',
    processing: 'processingCount',
    unknown: 'unknownCount',
};

const getBatchStatus = ({ successCount, failedCount, processingCount, unknownCount }) => {
    if (processingCount > 0) return 'processing';
    if (unknownCount > 0 || (successCount > 0 && failedCount > 0)) return 'partial';
    return failedCount > 0 ? 'failed' : 'completed';
};

const recordPayoutResult = async ({ payoutId, status, message = '' }) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const batch = await BulkPayoutBatch.findOne({ 'results.payoutId': payoutId });
        if (!batch) return null;

        const result = batch.results.find((entry) => String(entry.payoutId) === String(payoutId));
        if (!result || result.status === status) return batch;

        const previousField = COUNT_FIELDS[result.status];
        const nextField = COUNT_FIELDS[status];
        if (!nextField) throw new Error(`Unsupported bulk payout status: ${status}`);

        result.status = status;
        result.message = message;
        if (previousField) batch[previousField] = Math.max(0, batch[previousField] - 1);
        batch[nextField] += 1;
        batch.status = getBatchStatus(batch);

        try {
            await batch.save();
            return batch;
        } catch (error) {
            if (error.name !== 'VersionError') throw error;
        }
    }

    throw new Error(`Could not update bulk batch result for payout ${payoutId}`);
};

module.exports = { recordPayoutResult };