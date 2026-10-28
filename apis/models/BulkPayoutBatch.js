const mongoose = require('mongoose');

const bulkPayoutBatchSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, default: '' },

    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    processingCount: { type: Number, default: 0 },
    unknownCount: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['processing', 'completed', 'partial', 'failed'],
        default: 'processing',
    },

    results: [
        {
            rowIndex: Number,
            beneficiary_name: String,
            account_number_last4: String,
            amount: Number,
            status: { type: String, enum: ['success', 'processing', 'failed', 'unknown'] },
            message: String,
            payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', default: null },
        },
    ],
}, { timestamps: true });

bulkPayoutBatchSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BulkPayoutBatch', bulkPayoutBatchSchema);
