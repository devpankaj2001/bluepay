/**
 * Centralized activity/audit logging.
 *
 * Every call site (payout creation, login, credential rotation, webhook
 * changes, API requests, ...) goes through logActivity() so there is
 * exactly one place that:
 *   - always attributes to req.user's own id (never a body/query userId)
 *   - always sanitizes metadata (reuses utils/logger.js's redaction, which
 *     already knows how to strip secrets/passwords/tokens and mask account
 *     numbers)
 *   - never throws - a logging failure must never break the real request
 *     it's describing.
 *
 * Deliberately NOT awaited by callers in the hot path (fire-and-forget) -
 * see logActivity's callers, which invoke it without awaiting so a slow or
 * failing audit write can never delay or fail the merchant-facing response.
 */

const ActivityLog = require("../models/ActivityLog");
const { redact } = require("./logger");

const MAX_STRING_LEN = 500;

const truncate = (value) => {
    if (typeof value !== "string") return value;
    return value.length > MAX_STRING_LEN ? `${value.slice(0, MAX_STRING_LEN)}...` : value;
};

/**
 * Best-effort real client IP, respecting Express's `trust proxy` setting
 * (req.ip already accounts for that) - never invents an address.
 */
const getClientIp = (req) => {
    if (!req) return null;
    const ip = req.ip || req.connection?.remoteAddress || null;
    if (!ip) return null;
    // Normalize the common IPv4-mapped-IPv6 form (::ffff:127.0.0.1) for
    // readability/grouping in IP Logs.
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
};

/**
 * @param {object} params
 * @param {string} params.userId - required; must be req.user's own id.
 * @param {'USER_ACTIVITY'|'API_ACTIVITY'|'LOGIN_HISTORY'|'IP_LOG'} params.type
 * @param {string} params.action - short machine code, e.g. PAYOUT_CREATED
 * @param {string} [params.description]
 * @param {'SUCCESS'|'FAILED'} [params.status]
 * @param {string} [params.failureReason] - generic, non-sensitive
 * @param {string} [params.resourceType]
 * @param {string} [params.resourceId]
 * @param {object} [params.req] - the Express request, for requestId/IP/UA/method/endpoint
 * @param {number} [params.statusCode]
 * @param {number} [params.responseTime] - ms
 * @param {'test'|'live'} [params.environment]
 * @param {object} [params.metadata] - sanitized before storage; never put secrets here
 */
const logActivity = async ({
    userId,
    type,
    action,
    description = "",
    status = "SUCCESS",
    failureReason = "",
    resourceType = null,
    resourceId = null,
    req = null,
    statusCode = null,
    responseTime = null,
    environment = null,
    metadata = {},
}) => {
    try {
        if (!userId || !type || !action) return; // nothing useful to record

        await ActivityLog.create({
            userId,
            type,
            action,
            description: truncate(description),
            status,
            failureReason: truncate(failureReason),
            resourceType,
            resourceId: resourceId ? String(resourceId) : null,
            requestId: req?.requestId || null,
            method: req?.method || null,
            endpoint: req?.originalUrl ? req.originalUrl.split("?")[0] : null,
            statusCode,
            responseTime,
            environment,
            ipAddress: getClientIp(req),
            userAgent: truncate(req?.headers?.["user-agent"] || ""),
            metadata: redact(metadata),
        });
    } catch (error) {
        // Never let audit logging break the real request/response it's
        // describing - just note it happened, once, without secrets.
        // eslint-disable-next-line no-console
        console.error("activityLogger.logActivity failed:", error.message);
    }
};

module.exports = { logActivity, getClientIp };
