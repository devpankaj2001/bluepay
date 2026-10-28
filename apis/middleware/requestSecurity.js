const crypto = require('crypto');

const requestSecurity = (timeoutMs) => (req, res, next) => {
    const requestId = req.header('x-request-id') || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    req.setTimeout(timeoutMs);
    next();
};

module.exports = requestSecurity;