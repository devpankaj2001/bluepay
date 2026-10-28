const idempotencyCore = require("../utils/idempotencyCore");

const HEADER_NAME = "idempotency-key";

const MIN_KEY_LENGTH = 8;
const MAX_KEY_LENGTH = 200;
const KEY_PATTERN = /^[A-Za-z0-9_\-:.]+$/;

/**
 * Persists the final outcome on an idempotency record and sends the
 * response in one place, so every code path (success, business-rule
 * failure, unexpected error) ends up with a consistent, replayable record.
 *
 * NOTE: response bodies are stored as-is because callers already control
 * what goes into them; keep those payloads free of secrets (passwords,
 * tokens, full account numbers, etc.) the same way you would for any
 * API response.
 */
const finalize = async (record, res, statusCode, body, { resourceId = null, status } = {}) => {
    await idempotencyCore.finalize(record, { status, statusCode, body, resourceId });
    return res.status(statusCode).json(body);
};

/**
 * Express middleware factory. Guards a money-moving route with a
 * client-supplied Idempotency-Key.
 *
 * Usage:
 *   router.post('/', auth, idempotency('PAYOUT'), controller.createPayout);
 *
 * Downstream handlers receive `req.idempotency`:
 *   - record       the PROCESSING IdempotencyKey document owned by this request
 *   - complete(res, statusCode, body, resourceId)  -> mark SUCCESS, send response
 *   - fail(res, statusCode, body)                  -> mark FAILED, send response
 *
 * @param {'PAYOUT'|'FUNDING'|'REFUND'|'ADJUSTMENT'|'BULK_PAYOUT'|'SCHEDULED_PAYOUT'} requestType
 * @param {{ pickPayload?: (body: object) => object }} [options]
 *        pickPayload lets a route hash only the fields that define the
 *        operation (e.g. drop irrelevant metadata) instead of the raw body.
 */
const idempotency = (requestType, options = {}) => {
    const { pickPayload } = options;

    return async (req, res, next) => {
        try {
            const rawKey = req.header(HEADER_NAME);

            if (!rawKey || !rawKey.trim()) {
                return res.status(400).json({
                    msg: `${HEADER_NAME} header is required for this operation`,
                });
            }

            const key = rawKey.trim();

            if (key.length < MIN_KEY_LENGTH || key.length > MAX_KEY_LENGTH) {
                return res.status(400).json({
                    msg: `Idempotency-Key must be between ${MIN_KEY_LENGTH} and ${MAX_KEY_LENGTH} characters`,
                });
            }

            if (!KEY_PATTERN.test(key)) {
                return res.status(400).json({
                    msg: "Idempotency-Key may only contain letters, numbers, '_', '-', ':' and '.'",
                });
            }

            const userId = req.user && (req.user.id || req.user._id);

            if (!userId) {
                return res.status(401).json({ msg: "Authentication required" });
            }

            const payloadForHash = pickPayload ? pickPayload(req.body || {}) : req.body || {};

            const result = await idempotencyCore.claim({
                userId,
                key,
                requestType,
                payload: payloadForHash,
            });

            if (!result.claimed) {
                return res.status(result.statusCode).json(result.body);
            }

            const record = result.record;

            req.idempotency = {
                record,
                key,
                requestType,

                complete: (res2, statusCode, body, resourceId = null) =>
                    finalize(record, res2, statusCode, body, {
                        resourceId,
                        status: "SUCCESS",
                    }),

                fail: (res2, statusCode, body) =>
                    finalize(record, res2, statusCode, body, {
                        status: "FAILED",
                    }),
            };

            next();
        } catch (error) {
            console.error("idempotency middleware error:", error.message);

            return res.status(500).json({
                msg: "Failed to process idempotency check",
            });
        }
    };
};

module.exports = idempotency;
