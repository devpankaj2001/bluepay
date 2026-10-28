const { rateLimit } = require('express-rate-limit');

const numberFromEnv = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const allowedOrigins = () => {
    const configured = [process.env.FRONTEND_URL, process.env.ADMIN_URL, ...(process.env.ALLOWED_ORIGINS || '').split(',')]
        .map((origin) => String(origin || '').trim())
        .filter(Boolean);

    if (process.env.NODE_ENV === 'development') {
        configured.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174');
    }

    return [...new Set(configured)];
};

const isOriginAllowed = (origin) => !origin || allowedOrigins().includes(origin);

const limiter = (name, defaults) => rateLimit({
    windowMs: numberFromEnv(`${name}_WINDOW_MS`, defaults.windowMs),
    limit: numberFromEnv(`${name}_MAX`, defaults.limit),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: (req, res) => res.status(429).json({ msg: 'Too many requests. Please try again later.' }),
});

module.exports = {
    allowedOrigins,
    isOriginAllowed,
    requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '1mb',
    requestTimeoutMs: numberFromEnv('REQUEST_TIMEOUT_MS', 30_000),
    publicLimiter: limiter('RATE_LIMIT_PUBLIC', { windowMs: 15 * 60 * 1000, limit: 300 }),
    authLimiter: limiter('RATE_LIMIT_AUTH', { windowMs: 15 * 60 * 1000, limit: 10 }),
    credentialLimiter: limiter('RATE_LIMIT_CREDENTIALS', { windowMs: 15 * 60 * 1000, limit: 30 }),
    merchantApiLimiter: limiter('RATE_LIMIT_MERCHANT_API', { windowMs: 60 * 1000, limit: 120 }),
    webhookConfigLimiter: limiter('RATE_LIMIT_WEBHOOK_CONFIG', { windowMs: 60 * 1000, limit: 30 }),
};