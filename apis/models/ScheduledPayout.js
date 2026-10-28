const mongoose = require('mongoose');

const scheduledPayoutSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    beneficiary_name: { type: String, required: true },
    account_number: { type: String, required: true },
    ifsc_code: { type: String, required: true },
    bank_name: { type: String, default: '' },
    amount: { type: Number, required: true },
    remarks: { type: String, default: '' },

    frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly'],
        required: true,
    },

    nextRunAt: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null }, // optional cutoff for recurring schedules

    // 'running' is a short-lived claim state used by the scheduler to
    // prevent the same due schedule being executed twice concurrently.
    status: {
        type: String,
        enum: ['active', 'paused', 'running', 'completed', 'cancelled'],
        default: 'active',
        index: true,
    },

    lastRunAt: { type: Date, default: null },
    lastRunStatus: { type: String, default: null }, // payout status of the most recent execution, or 'error'
    lastPayoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', default: null },
    lastError: { type: String, default: '' },

    runCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('ScheduledPayout', scheduledPayoutSchema);
