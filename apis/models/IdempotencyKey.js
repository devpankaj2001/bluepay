const mongoose = require("mongoose");

/**
 * IdempotencyKey
 *
 * One document represents one attempt (or retry-after-failure) of a
 * money-moving request identified by a client-supplied Idempotency-Key.
 *
 * Concurrency safety comes from the compound UNIQUE index below, not from
 * application logic: MongoDB guarantees that only one `create()` can win
 * when two requests race to insert the same
 * (userId, idempotencyKey, requestType) tuple. The loser gets an E11000
 * duplicate key error and is expected to look up the winner's record
 * (see utils/idempotency.js) instead of processing the request again.
 */
const idempotencyKeySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        idempotencyKey: {
            type: String,
            required: true,
            trim: true,
        },

        // What kind of money-moving operation this key guards.
        requestType: {
            type: String,
            enum: ["PAYOUT", "FUNDING", "REFUND", "ADJUSTMENT", "BULK_PAYOUT", "SCHEDULED_PAYOUT"],
            required: true,
        },

        // SHA-256 hash of the normalized request payload.
        // Used to detect "same key, different body" misuse.
        requestHash: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: ["PROCESSING", "SUCCESS", "FAILED"],
            default: "PROCESSING",
            index: true,
        },

        // ID of the resource created by this request (e.g. Payout._id).
        resourceId: {
            type: String,
            default: null,
        },

        // The exact HTTP response returned for the winning attempt, so
        // retries can be replayed byte-for-byte instead of recomputed.
        response: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        // TTL: how long this key is remembered. After this, the same
        // key may be reused for a brand-new request. Kept generous
        // enough to outlast realistic client retry windows.
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
    }
);

// The core safety mechanism: DB-enforced uniqueness per user/key/type.
idempotencyKeySchema.index(
    { userId: 1, idempotencyKey: 1, requestType: 1 },
    { unique: true }
);

// Automatic cleanup once a key is no longer relevant.
idempotencyKeySchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("IdempotencyKey", idempotencyKeySchema);
