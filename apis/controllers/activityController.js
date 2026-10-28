const mongoose = require("mongoose");
const ActivityLog = require("../models/ActivityLog");
const ApiRequestMetric = require("../models/ApiRequestMetric");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
    return { page, limit, skip: (page - 1) * limit };
};

const parseDateRange = (query) => {
    const range = {};

    if (query.dateFrom) {
        const from = new Date(query.dateFrom);
        if (!Number.isNaN(from.getTime())) range.$gte = from;
    }

    if (query.dateTo) {
        const to = new Date(query.dateTo);
        if (!Number.isNaN(to.getTime())) {
            to.setHours(23, 59, 59, 999);
            range.$lte = to;
        }
    }

    return Object.keys(range).length ? range : null;
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Shared list handler for the three simple (non-aggregated) activity views.
 * Ownership is always req.user's own id - never accepted from the client.
 */
const listActivity = async ({ req, res, type, searchFields, allowedStatus }) => {
    try {
        const userId = req.user.id || req.user._id;
        const { page, limit, skip } = parsePagination(req.query);

        const query = { userId, type };

        const dateRange = parseDateRange(req.query);
        if (dateRange) query.createdAt = dateRange;

        if (req.query.status) {
            const status = String(req.query.status).toUpperCase();
            if (!allowedStatus.includes(status)) {
                return res.status(400).json({ msg: `Invalid status filter. Must be one of: ${allowedStatus.join(", ")}` });
            }
            query.status = status;
        }

        const search = String(req.query.search || "").trim();
        if (search) {
            const regex = { $regex: escapeRegex(search), $options: "i" };
            query.$or = searchFields.map((field) => ({ [field]: regex }));
        }

        const [data, total] = await Promise.all([
            ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            ActivityLog.countDocuments(query),
        ]);

        return res.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        console.error(`listActivity(${type}):`, error.message);
        return res.status(500).json({ msg: "Failed to load activity", requestId: req.requestId });
    }
};

/**
 * GET /api/activity/user
 */
exports.getUserActivity = (req, res) =>
    listActivity({
        req,
        res,
        type: "USER_ACTIVITY",
        searchFields: ["action", "description", "resourceType"],
        allowedStatus: ["SUCCESS", "FAILED"],
    });

/**
 * GET /api/activity/api
 *
 * Unions two existing sources instead of introducing a third parallel log:
 *   - ApiRequestMetric: written by the existing middleware/apiRequestMetrics.js
 *     for every completed merchant-API-key request (reused, not duplicated -
 *     see middleware/merchantApiAuth.js, which deliberately does NOT log
 *     successes itself to avoid a second write per request).
 *   - ActivityLog (type=API_ACTIVITY, status=FAILED): written by
 *     merchantApiAuth.js ONLY for requests that never got far enough to
 *     reach apiRequestMetrics (bad/unknown/expired API key or secret) -
 *     a case ApiRequestMetric structurally cannot record, since req.user is
 *     never set for it.
 */
exports.getApiActivity = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId((req.user.id || req.user._id).toString());
        const { page, limit, skip } = parsePagination(req.query);

        const dateRange = parseDateRange(req.query);

        let statusFilter = null;
        if (req.query.status) {
            statusFilter = String(req.query.status).toUpperCase();
            if (!["SUCCESS", "FAILED"].includes(statusFilter)) {
                return res.status(400).json({ msg: "Invalid status filter. Must be one of: SUCCESS, FAILED" });
            }
        }

        const search = String(req.query.search || "").trim();
        const searchRegex = search ? { $regex: escapeRegex(search), $options: "i" } : null;

        const metricMatch = { userId };
        if (dateRange) metricMatch.createdAt = dateRange;
        if (statusFilter) metricMatch.success = statusFilter === "SUCCESS";
        if (searchRegex) metricMatch.$or = [{ endpoint: searchRegex }, { method: searchRegex }];

        const logMatch = { userId, type: "API_ACTIVITY" };
        if (dateRange) logMatch.createdAt = dateRange;
        if (statusFilter) logMatch.status = statusFilter;
        if (searchRegex) logMatch.$or = [{ endpoint: searchRegex }, { method: searchRegex }, { action: searchRegex }];

        const metricProjection = {
            $project: {
                _id: 1,
                method: 1,
                endpoint: 1,
                statusCode: 1,
                responseTime: "$durationMs",
                environment: 1,
                ipAddress: 1,
                status: { $cond: ["$success", "SUCCESS", "FAILED"] },
                createdAt: 1,
            },
        };

        const logProjection = {
            $project: {
                _id: 1,
                method: 1,
                endpoint: 1,
                statusCode: 1,
                responseTime: 1,
                environment: 1,
                ipAddress: 1,
                status: 1,
                createdAt: 1,
            },
        };

        const pipeline = [
            { $match: metricMatch },
            metricProjection,
            {
                $unionWith: {
                    coll: ActivityLog.collection.name,
                    pipeline: [{ $match: logMatch }, logProjection],
                },
            },
            { $sort: { createdAt: -1 } },
        ];

        const [data, totalResult] = await Promise.all([
            ApiRequestMetric.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
            ApiRequestMetric.aggregate([...pipeline, { $count: "total" }]),
        ]);

        const total = totalResult[0]?.total || 0;

        return res.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        console.error("getApiActivity:", error.message);
        return res.status(500).json({ msg: "Failed to load API activity", requestId: req.requestId });
    }
};

/**
 * GET /api/activity/login
 */
exports.getLoginHistory = (req, res) =>
    listActivity({
        req,
        res,
        type: "LOGIN_HISTORY",
        searchFields: ["ipAddress", "userAgent", "failureReason"],
        allowedStatus: ["SUCCESS", "FAILED"],
    });

/**
 * GET /api/activity/ip
 *
 * Not a simple find() - IP Logs is a derived view aggregating every
 * activity/login/API row for this merchant, grouped by the real IP address
 * that was actually recorded on each row (never invented). "source" reflects
 * which surface that IP was seen on.
 */
exports.getIpLogs = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { page, limit, skip } = parsePagination(req.query);

        const match = {
            userId: new mongoose.Types.ObjectId(userId.toString()),
            ipAddress: { $ne: null },
        };

        const dateRange = parseDateRange(req.query);
        if (dateRange) match.createdAt = dateRange;

        const search = String(req.query.search || "").trim();
        if (search) {
            match.ipAddress = { $ne: null, $regex: escapeRegex(search), $options: "i" };
        }

        const sourceExpr = {
            $switch: {
                branches: [
                    { case: { $eq: ["$type", "LOGIN_HISTORY"] }, then: "Login" },
                    { case: { $eq: ["$type", "API_ACTIVITY"] }, then: "API" },
                ],
                default: "Dashboard",
            },
        };

        // Successful merchant-API requests only ever live in
        // ApiRequestMetric (see getApiActivity's doc comment) - unioned in
        // here too so IP Logs' "API" source isn't missing that traffic.
        const metricMatch = {
            userId: match.userId,
            ipAddress: { $ne: null },
        };
        if (match.createdAt) metricMatch.createdAt = match.createdAt;
        if (search) metricMatch.ipAddress = { $ne: null, $regex: escapeRegex(search), $options: "i" };

        const pipeline = [
            { $match: match },
            {
                $unionWith: {
                    coll: ApiRequestMetric.collection.name,
                    pipeline: [
                        { $match: metricMatch },
                        { $project: { ipAddress: 1, createdAt: 1, type: { $literal: "API_ACTIVITY" } } },
                    ],
                },
            },
            {
                $group: {
                    _id: { ip: "$ipAddress", source: sourceExpr },
                    firstSeen: { $min: "$createdAt" },
                    lastSeen: { $max: "$createdAt" },
                    count: { $sum: 1 },
                    lastStatus: { $last: "$status" },
                },
            },
            {
                $project: {
                    _id: 0,
                    ipAddress: "$_id.ip",
                    source: "$_id.source",
                    firstSeen: 1,
                    lastSeen: 1,
                    count: 1,
                    lastStatus: 1,
                },
            },
            { $sort: { lastSeen: -1 } },
        ];

        const [rows, totalResult] = await Promise.all([
            ActivityLog.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
            ActivityLog.aggregate([...pipeline, { $count: "total" }]),
        ]);

        const total = totalResult[0]?.total || 0;

        return res.json({
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        console.error("getIpLogs:", error.message);
        return res.status(500).json({ msg: "Failed to load IP logs", requestId: req.requestId });
    }
};
