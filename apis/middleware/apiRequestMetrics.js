const ApiRequestMetric = require('../models/ApiRequestMetric');
const { getClientIp } = require('../utils/activityLogger');

const apiRequestMetrics = (req, res, next) => {
    const startedAt = Date.now();

    res.once('finish', () => {
        if (!req.user?.id || req.user.role !== 'merchant-api') return;

        ApiRequestMetric.create({
            userId: req.user.id,
            endpoint: req.route?.path || req.path,
            method: req.method,
            statusCode: res.statusCode,
            success: res.statusCode < 400,
            durationMs: Date.now() - startedAt,
            environment: req.apiCredential?.environment || null,
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'] || '',
            requestId: req.requestId || null,
        }).catch(() => {
            // Reporting telemetry must never change the API response.
        });
    });

    next();
};

module.exports = apiRequestMetrics;