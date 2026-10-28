const mongoose = require("mongoose");

const ledgerTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        transactionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // CREDIT = money coming into merchant wallet
        // DEBIT  = money going out of merchant wallet
        type: {
            type: String,
            enum: ["CREDIT", "DEBIT"],
            required: true,
        },

        category: {
            type: String,
            enum: [
                "FUNDING",
                "PAYOUT",
                "PAYOUT_REVERSAL",
                "REFUND",
                "FEE",
                "ADJUSTMENT",
                "REVERSAL",
            ],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },

        // Balance after this transaction
        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "PROCESSING",
                "SUCCESS",
                "FAILED",
                "REVERSED",
            ],
            default: "SUCCESS",
            index: true,
        },

        referenceId: {
            type: String,
            default: null,
            index: true,
        },

        referenceType: {
            type: String,
            enum: [
                "FundRequest",
                "Payout",
                "CCAvenue",
                "Kotak",
                "Manual",
                null,
            ],
            default: null,
        },

        description: {
            type: String,
            default: "",
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Useful for statement queries
ledgerTransactionSchema.index({
    userId: 1,
    createdAt: -1,
});

ledgerTransactionSchema.index({
    userId: 1,
    type: 1,
    status: 1,
});

ledgerTransactionSchema.index({
    userId: 1,
    category: 1,
    createdAt: -1,
});

module.exports = mongoose.model(
    "LedgerTransaction",
    ledgerTransactionSchema
);