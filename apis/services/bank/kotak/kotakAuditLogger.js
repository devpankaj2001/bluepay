const ActivityLog = require("../../../models/ActivityLog");
const logger = require("../../../utils/logger");

const SECRET_KEY = /(client.?(secret|id|code)|api.?secret|api.?key|access.?token|password|encryption.?key|private.?key|authorization|cookie)/i;
const SENSITIVE_XML_TAG = /^(account|bene|client(code)?|msg(src|source)|email|fax|telephone|authperson|txnAmnt|paymentdt|paymentdtl)/i;

const redactCredentials = (value) => String(value ?? "")
    .replace(/\bBearer\s+[^\s,;"']+/gi, "Bearer [REDACTED]")
    .replace(/(["']?(?:client[_-]?(?:secret|id|code)|api[_-]?secret|api[_-]?key|access[_-]?token|password|encryption[_-]?key|private[_-]?key)["']?\s*:\s*["']?)[^"',\s}]+/gi, "$1[REDACTED]")
    .replace(/(client[_-]?(?:secret|id|code)|api[_-]?secret|api[_-]?key|access[_-]?token|password|encryption[_-]?key|private[_-]?key|authorization)(\s*[:=]\s*)[^\s,;"']+/gi, "$1$2[REDACTED]");
const redactText = (value) => redactCredentials(value).replace(/\b\d{9,18}\b/g, "[REDACTED]");

const sanitizeObject = (value) => {
    if (Array.isArray(value)) return value.map(sanitizeObject);
    if (!value || typeof value !== "object") return redactText(value);

    const result = {};
    for (const [key, item] of Object.entries(value)) {
        if (/^(requestid|messageid|transactionid|utr|providerreference)$/i.test(key)) {
            result[key] = redactCredentials(item);
        } else if (/^(account|bene|email|fax|telephone|mobile|phone)/i.test(key)) {
            result[key] = "[REDACTED]";
        } else if (key.toLowerCase() === "access_token" || key.toLowerCase() === "accesstoken") {
            result[key] = "********";
        } else if (SECRET_KEY.test(key)) {
            result[key] = "[REDACTED]";
        } else {
            result[key] = sanitizeObject(item);
        }
    }
    return result;
};

const sanitizeXml = (xml) => String(xml).replace(
    /(<(?:(?:\w+):)?([\w-]+)(?:\s[^>]*)?>)([^<>]*)(<\/(?:(?:\w+):)?\2>)/gi,
    (match, openTag, tagName, value, closeTag) => SENSITIVE_XML_TAG.test(tagName.replace(/[_-]/g, ""))
        ? `${openTag}[REDACTED]${closeTag}`
        : `${openTag}${redactText(value)}${closeTag}`
);

const sanitizePayload = (value) => {
    if (value == null) return null;
    if (typeof value === "object") return sanitizeObject(value);

    const text = String(value);
    const trimmed = text.trim();
    if (trimmed.startsWith("<")) return sanitizeXml(trimmed);

    try {
        return sanitizeObject(JSON.parse(trimmed));
    } catch (_) {
        // OAuth form bodies may contain client_secret; keep their actual fields but redact credentials.
    }

    if (trimmed.includes("=") && !/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
        const form = new URLSearchParams(trimmed);
        if ([...form.keys()].length) {
            const result = {};
            for (const [key, item] of form.entries()) {
                result[key] = SECRET_KEY.test(key) ? "[REDACTED]" : redactText(item);
            }
            return result;
        }
    }

    if (/^[A-Za-z0-9+/=\s]{64,}$/.test(trimmed)) {
        return { encryptedPayloadOmitted: true, encodedLength: trimmed.length };
    }
    return redactText(trimmed);
};

const sanitizeHeaders = (headers = {}) => {
    const result = {};
    for (const [key, value] of Object.entries(headers)) {
        if (/^(set-cookie|proxy-authorization)$/i.test(key)) continue;
        if (/^authorization$/i.test(key)) {
            result[key] = /^\s*Bearer\s+/i.test(String(value)) ? "Bearer ********" : "[REDACTED]";
            continue;
        }
        if (SECRET_KEY.test(key)) {
            result[key] = "[REDACTED]";
            continue;
        }
        result[key] = redactText(Array.isArray(value) ? value.join(", ") : value);
    }
    return result;
};

const sanitizeResponseBody = (value) => {
    if (value == null || value === "") return null;
    if (typeof value === "object") return sanitizePayload(value);
    const text = String(value).trim();
    if (text.startsWith("<")) return sanitizeXml(text);
    const sanitized = sanitizePayload(text);
    if (sanitized && typeof sanitized === "object" && sanitized.encryptedPayloadOmitted) {
        return { encryptedResponseOmitted: true, encodedLength: sanitized.encodedLength };
    }
    return sanitized;
};

const sanitizeIdentifier = (value) => value == null || value === "" ? null : redactCredentials(value);

const safeEndpoint = (url) => {
    try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
    } catch (_) {
        return String(url || "").split("?")[0];
    }
};

const writeKotakApiAudit = async (record) => {
    try {
        const safe = {
            apiName: redactText(record.apiName),
            endpoint: safeEndpoint(record.endpoint),
            method: redactText(record.method || "POST"),
                environment: record.environment || null,
            requestTimestamp: record.requestTimestamp || null,
            responseTimestamp: record.responseTimestamp || null,
            durationMs: Number.isFinite(record.durationMs) ? record.durationMs : null,
            httpStatus: Number.isInteger(record.httpStatus) ? record.httpStatus : null,
            applicationStatus: ["SUCCESS", "PROCESSING", "FAILED", "UNKNOWN"].includes(record.applicationStatus)
                ? record.applicationStatus
                : "UNKNOWN",
            requestId: sanitizeIdentifier(record.requestId),
            messageId: sanitizeIdentifier(record.messageId),
            transactionId: sanitizeIdentifier(record.transactionId),
            providerReference: sanitizeIdentifier(record.providerReference),
            requestHeadersSanitized: sanitizeHeaders(record.requestHeaders || {}),
            requestPayloadSanitized: sanitizePayload(record.requestPayload),
            responseBodySanitized: sanitizeResponseBody(record.responseBody),
            responseCode: redactText(record.responseCode || "") || null,
            responseMessage: redactText(record.responseMessage || "") || null,
            errorCode: redactText(record.errorCode || "") || null,
            errorMessage: redactText(record.errorMessage || "") || null,
            errorType: redactText(record.errorType || "") || null,
            tokenType: redactText(record.tokenType || "") || null,
            expiresIn: Number.isFinite(record.expiresIn) ? record.expiresIn : null,
        };

        const action = `KOTAK_${safe.apiName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
        await ActivityLog.create({
            type: "KOTAK_API",
            action,
            description: `${safe.method} ${safe.endpoint}`,
            requestId: safe.requestId,
            method: safe.method,
            endpoint: safe.endpoint,
            statusCode: safe.httpStatus,
            responseTime: safe.durationMs,
            environment: safe.environment,
            status: safe.applicationStatus,
            failureReason: safe.errorMessage || safe.responseMessage || "",
            metadata: safe,
        });
    } catch (error) {
        logger.error("kotak.audit.persistFailed", {
            errorCode: error.code || "AUDIT_WRITE_FAILED",
            errorMessage: error.message,
        });
    }
};

module.exports = { writeKotakApiAudit, sanitizeHeaders, sanitizePayload, sanitizeResponseBody, sanitizeIdentifier };