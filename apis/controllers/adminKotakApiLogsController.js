const ActivityLog = require("../models/ActivityLog");
const { sanitizeHeaders, sanitizePayload, sanitizeResponseBody, sanitizeIdentifier } = require("../services/bank/kotak/kotakAuditLogger");

const ALLOWED_API_NAMES = ["OAuth Token API", "Payment API", "Status / Reversal API"];
const ALLOWED_STATUSES = ["SUCCESS", "PROCESSING", "FAILED", "UNKNOWN"];
const MAX_PAGE_SIZE = 100;
const safeText = (value) => value == null || value === "" ? null : sanitizePayload(String(value));

const parseDate = (value, endOfDay = false) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999);
    return date;
};

const readString = (value) => (typeof value === "string" ? value.trim().slice(0, 200) : "");

const toSafeRecord = (log) => {
    const metadata = log.metadata || {};
    return {
        _id: log._id,
        type: log.type,
        action: log.action,
        description: log.description,
        apiName: safeText(metadata.apiName) || log.action || "Not available",
        endpoint: safeText(log.endpoint || metadata.endpoint) || "Not available",
        method: safeText(log.method || metadata.method) || "POST",
        environment: ["test", "uat", "live"].includes(log.environment || metadata.environment) ? (log.environment || metadata.environment) : null,
        requestTimestamp: metadata.requestTimestamp || log.createdAt,
        responseTimestamp: metadata.responseTimestamp || null,
        durationMs: Number.isFinite(metadata.durationMs) ? metadata.durationMs : (log.responseTime ?? null),
        httpStatus: log.statusCode ?? metadata.httpStatus ?? null,
        applicationStatus: ALLOWED_STATUSES.includes(metadata.applicationStatus) ? metadata.applicationStatus : log.status,
        requestId: sanitizeIdentifier(log.requestId || metadata.requestId),
        messageId: sanitizeIdentifier(metadata.messageId),
        transactionId: sanitizeIdentifier(metadata.transactionId),
        providerReference: sanitizeIdentifier(metadata.providerReference),
        requestHeadersSanitized: sanitizeHeaders(metadata.requestHeadersSanitized || {}),
        requestPayloadSanitized: sanitizePayload(metadata.requestPayloadSanitized || metadata.payload),
        responseBodySanitized: sanitizeResponseBody(metadata.responseBodySanitized || metadata.response || log.failureReason),
        responseCode: safeText(metadata.responseCode),
        responseMessage: safeText(metadata.responseMessage || log.failureReason),
        errorCode: safeText(metadata.errorCode),
        errorMessage: safeText(metadata.errorMessage || log.failureReason),
        errorType: safeText(metadata.errorType),
        tokenType: safeText(metadata.tokenType),
        expiresIn: Number.isFinite(metadata.expiresIn) ? metadata.expiresIn : null,
        createdAt: log.createdAt || null,
        ipAddress: log.ipAddress || null,
    };
};

exports.getKotakApiLogs = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const dateFrom = parseDate(req.query.dateFrom);
    const dateTo = parseDate(req.query.dateTo, true);
    if ((req.query.dateFrom && !dateFrom) || (req.query.dateTo && !dateTo)) {
        return res.status(400).json({ msg: "Dates must be valid ISO dates", requestId: req.requestId });
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
        return res.status(400).json({ msg: "dateFrom must be before dateTo", requestId: req.requestId });
    }

    const requestedType = req.query.type ? String(req.query.type).trim().toUpperCase() : "KOTAK_API";
    const match = requestedType === "ALL" ? {} : { type: requestedType };
    const apiName = readString(req.query.apiName);
    if (apiName && match.type === "KOTAK_API") {
        if (!ALLOWED_API_NAMES.includes(apiName)) return res.status(400).json({ msg: "Invalid apiName", requestId: req.requestId });
        match["metadata.apiName"] = apiName;
    }

    const environment = readString(req.query.environment).toLowerCase();
    if (environment) {
        if (!["test", "uat", "live"].includes(environment)) return res.status(400).json({ msg: "Invalid environment", requestId: req.requestId });
        match.environment = environment;
    }

    const status = readString(req.query.status).toUpperCase();
    if (status) {
        if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ msg: "Invalid status", requestId: req.requestId });
        match["metadata.applicationStatus"] = status;
    }

    if (req.query.httpStatus !== undefined && req.query.httpStatus !== "") {
        const httpStatus = Number(req.query.httpStatus);
        if (!Number.isInteger(httpStatus) || httpStatus < 100 || httpStatus > 599) {
            return res.status(400).json({ msg: "Invalid httpStatus", requestId: req.requestId });
        }
        match.statusCode = httpStatus;
    }

    const requestId = readString(req.query.requestId);
    const messageId = readString(req.query.messageId);
    const transactionId = readString(req.query.transactionId);
    if (requestId) match.requestId = requestId;
    if (messageId) match["metadata.messageId"] = messageId;
    if (transactionId) match["metadata.transactionId"] = transactionId;
    if (dateFrom || dateTo) {
        match["metadata.requestTimestamp"] = { ...(dateFrom ? { $gte: dateFrom } : {}), ...(dateTo ? { $lte: dateTo } : {}) };
    }

    try {
        const [records, total] = await Promise.all([
            ActivityLog.find(match)
                .select("type metadata action description requestId method endpoint statusCode responseTime status environment ipAddress createdAt")
                .sort({ "metadata.requestTimestamp": -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments(match),
        ]);

        return res.json({
            logs: records.map(toSafeRecord),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (_) {
        return res.status(500).json({ msg: "Failed to load Kotak API logs", requestId: req.requestId });
    }
};