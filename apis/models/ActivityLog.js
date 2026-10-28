const mongoose = require("mongoose");

/**
 * Centralized audit/activity log for the merchant-facing "Activity Logs"
 * module (User Activity, API Activity, Login History, IP Logs are all
 * different views/filters over this single collection, not separate
 * models - they share the same ownership, security, and pagination rules).
 *
 * Rows are created server-side only (see utils/activityLogger.js), never
 * directly from a client request body, so a merchant can never fabricate
 * their own audit trail.
 */
const activityLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () { return this.type !== "KOTAK_API"; },
            index: true,
        },

        type: {
            type: String,
            enum: ["USER_ACTIVITY", "API_ACTIVITY", "LOGIN_HISTORY", "IP_LOG", "KOTAK_API"],
            required: true,
            index: true,
        },

        // Short machine-readable action code, e.g. PAYOUT_CREATED, LOGIN_SUCCESS.
        action: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            default: "",
        },

        resourceType: {
            type: String,
            default: null,
        },

        resourceId: {
            type: String,
            default: null,
        },

        requestId: {
            type: String,
            default: null,
            index: true,
        },

        method: {
            type: String,
            default: null,
        },

        endpoint: {
            type: String,
            default: null,
        },

        statusCode: {
            type: Number,
            default: null,
        },

        // Milliseconds.
        responseTime: {
            type: Number,
            default: null,
        },

        environment: {
            type: String,
            enum: ["test", "uat", "live", null],
            default: null,
        },

        ipAddress: {
            type: String,
            default: null,
            index: true,
        },

        userAgent: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            enum: ["SUCCESS", "PROCESSING", "FAILED", "UNKNOWN"],
            required: true,
        },

        // Generic, non-sensitive reason string (never a stack trace or a
        // secret) - e.g. "Invalid credentials", "Account inactive".
        failureReason: {
            type: String,
            default: "",
        },

        // Free-form, but ALWAYS passed through utils/activityLogger.js's
        // sanitizer before being stored - never trust a caller to have
        // pre-sanitized this themselves.
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, type: 1, createdAt: -1 });
activityLogSchema.index({ ipAddress: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
