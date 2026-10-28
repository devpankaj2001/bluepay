const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    environment: { type: String, enum: ['test', 'live'], default: 'live', index: true },
    beneficiary_name: { type: String, required: true },
    account_number: { type: String, required: true },
    ifsc_code: { type: String, required: true },
    bank_name: { type: String, default: '' },
    txn_id: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'processing', 'success', 'failed', 'unknown'],
        default: 'pending'
    },
    remarks: { type: String, default: '' }, // failure reason etc

    // --- Provider (bank) integration fields ---
    // Populated once the payout is submitted to a bank provider (Kotak).
    // Never store authentication secrets here - only transaction/reference
    // metadata needed for reconciliation and safe retries.
    provider: { type: String, default: null }, // e.g. 'KOTAK'
    providerReference: { type: String, default: null }, // BluePay-generated, unique, reused on retry (see index below)
    providerTransactionId: { type: String, default: null }, // Kotak's own transaction id
    providerStatus: { type: String, default: null }, // raw status string as reported by provider
    providerResponseCode: { type: String, default: null },
    providerMessage: { type: String, default: '' },
    providerRequestId: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    lastStatusCheckedAt: { type: Date, default: null },

    // Set when this payout was created as part of a bulk CSV batch.
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'BulkPayoutBatch', default: null, index: true },

    // Set when this payout was created by the scheduled-payout runner.
    scheduledPayoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledPayout', default: null, index: true },

    // Atomic claim marker used by schedulers/reconciliationRunner.js so two
    // overlapping reconciliation ticks (or two app instances) never both
    // re-check the same stuck PROCESSING/UNKNOWN payout at once.
    reconciliationLockedAt: { type: Date, default: null },
}, { timestamps: true });

// Powers reconciliationRunner's sweep for stuck PROCESSING/UNKNOWN payouts.
payoutSchema.index({ status: 1, lastStatusCheckedAt: 1 });

// Guards against the same provider reference ever being attached to two
// different payouts (defense in depth on top of the retry logic reusing it
// only for the same payout).
payoutSchema.index(
    { providerReference: 1 },
    { unique: true, sparse: true }
);

const Payout = mongoose.model('Payout', payoutSchema);
module.exports = Payout;
