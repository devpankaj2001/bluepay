const mongoose = require("mongoose");

const webhookEndpointSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        url: {
            type: String,
            required: true,
            trim: true
        },

        environment: { type: String, enum: ['test', 'live'], required: true, default: 'live', index: true },
        secretEncrypted: { type: String, required: true, select: false },
        // Legacy records are migrated when their secret is regenerated.
        secret: { type: String, select: false },

        events: {
            type: [String],
            enum: [
                "payout.success",
                "payout.failed",
                "payout.processing",
                "payout.unknown",
                "wallet.credited"
            ],
            default: []
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

webhookEndpointSchema.index({ userId: 1, environment: 1 }, { unique: true });

module.exports = mongoose.model(
    "WebhookEndpoint",
    webhookEndpointSchema
);