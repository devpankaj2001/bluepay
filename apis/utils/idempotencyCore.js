const crypto = require("crypto");

const IdempotencyKey = require("../models/IdempotencyKey");

const MONGO_DUPLICATE_KEY_ERROR = 11000;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Deterministically stringifies a value regardless of key insertion order,
 * so two logically-identical payloads always hash to the same value.
 */
const stableStringify = (value) => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    const keys = Object.keys(value).sort();

    return `{${keys
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
};

const hashPayload = (payload) => {
    return crypto
        .createHash("sha256")
        .update(stableStringify(payload || {}))
        .digest("hex");
};

/**
 * Core of the idempotency guarantee, usable both from HTTP middleware
 * (idempotencyMiddleware.js) and from internal/background callers that
 * don't have a req/res (bulk payout rows, scheduled payout executions).
 *
 * Returns either:
 *   { claimed: true, record }
 *   { claimed: false, statusCode, body }  - caller must short-circuit with this
 */
const claim = async ({ userId, key, requestType, payload }) => {
    const requestHash = hashPayload(payload);

    try {
        const record = await IdempotencyKey.create({
            userId,
            idempotencyKey: key,
            requestType,
            requestHash,
            status: "PROCESSING",
            expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
        });

        return { claimed: true, record };
    } catch (err) {
        const isDuplicate =
            err && (err.code === MONGO_DUPLICATE_KEY_ERROR || err.codeName === "DuplicateKey");

        if (!isDuplicate) {
            throw err;
        }

        const existing = await IdempotencyKey.findOne({ userId, idempotencyKey: key, requestType });

        if (!existing) {
            return {
                claimed: false,
                statusCode: 409,
                body: { msg: "Duplicate request detected, please retry" },
            };
        }

        if (existing.requestHash !== requestHash) {
            return {
                claimed: false,
                statusCode: 409,
                body: { msg: "This Idempotency-Key was already used with a different request payload" },
            };
        }

        if (existing.status === "SUCCESS") {
            const stored = existing.response || {};
            return {
                claimed: false,
                statusCode: stored.statusCode || 200,
                body: stored.body || { success: true, msg: "Request already processed" },
            };
        }

        if (existing.status === "PROCESSING") {
            return {
                claimed: false,
                statusCode: 409,
                body: { msg: "An identical request is already being processed. Please retry shortly." },
            };
        }

        // status === 'FAILED' -> safe to retry. Reclaim atomically.
        const reclaimed = await IdempotencyKey.findOneAndUpdate(
            { _id: existing._id, status: "FAILED" },
            {
                $set: {
                    status: "PROCESSING",
                    requestHash,
                    response: null,
                    expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
                },
            },
            { new: true }
        );

        if (!reclaimed) {
            return {
                claimed: false,
                statusCode: 409,
                body: { msg: "An identical request is already being processed. Please retry shortly." },
            };
        }

        return { claimed: true, record: reclaimed };
    }
};

/**
 * Persists the final outcome on an idempotency record.
 */
const finalize = async (record, { status, statusCode, body, resourceId = null }) => {
    record.status = status;
    record.response = { statusCode, body };

    if (resourceId !== null) {
        record.resourceId = resourceId;
    }

    try {
        await record.save();
    } catch (saveError) {
        console.error("idempotencyCore: failed to persist final status", saveError.message);
    }
};

module.exports = {
    hashPayload,
    claim,
    finalize,
};
