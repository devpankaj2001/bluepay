const mongoose = require("mongoose");

const webhookDeliverySchema = new mongoose.Schema(
    {
        webhookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WebhookEndpoint",
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        eventId: {
            type: String,
            required: true,
            index: true
        },

        event: {
            type: String,
            required: true
        },

        environment: { type: String, enum: ['test', 'live'], required: true, default: 'live', index: true },
        endpointUrl: { type: String, required: true },

        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "sending", "delivered", "failed", "retrying"],
            default: "pending"
        },

        attempts: {
            type: Number,
            default: 0
        },

        responseCode: {
            type: Number,
            default: null
        },

        responseMessage: {
            type: String,
            default: ""
        },

        lastAttemptAt: {
            type: Date,
            default: null
        },

        nextRetryAt: {
            type: Date,
            default: null
        },

        deliveredAt: { type: Date, default: null }
    },
    { timestamps: true }
);

// Powers schedulers/webhookDispatcher.js's polling query (due deliveries by
// status, ordered by when they're next eligible).
webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

// Lets an endpoint's delivery history be listed/filtered efficiently.
webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });

module.exports = mongoose.model(
    "WebhookDelivery",
    webhookDeliverySchema
);