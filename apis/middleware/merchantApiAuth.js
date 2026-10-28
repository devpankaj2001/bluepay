const DeveloperCredential = require('../models/DeveloperCredential');
const { hashSecret, verifySecret } = require('../utils/developerCredentialSecurity');
const { logActivity } = require('../utils/activityLogger');

const AUTH_ERROR = { msg: 'Invalid API credentials' };
const VALID_ENVIRONMENTS = ['test', 'live'];

// Attributable failure logging: only when the apiKey actually matched a real
// credential (so there's a genuine merchant to attribute the failure to) -
// never logs anything for a bare/malformed/unknown key, which isn't a real
// merchant's activity to record.
const logFailure = (req, credential, reason) => {
    if (!credential) return;
    logActivity({
        userId: credential.userId,
        type: 'API_ACTIVITY',
        action: 'API_REQUEST_FAILED',
        description: reason,
        status: 'FAILED',
        failureReason: reason,
        req,
        statusCode: 401,
        environment: credential.environment,
    });
};

const merchantApiAuth = async (req, res, next) => {
    const apiKey = req.header('x-api-key');
    const apiSecret = req.header('x-api-secret');
    const requestedEnvironment = req.header('x-bluepay-environment');

    if (
        typeof apiKey !== 'string' || apiKey.length > 150 || !/^bp_(test|live)_[a-f0-9]+$/i.test(apiKey) ||
        typeof apiSecret !== 'string' || apiSecret.length > 200 || !/^bps_[a-f0-9]+$/i.test(apiSecret) ||
        typeof requestedEnvironment !== 'string'
    ) {
        return res.status(401).json(AUTH_ERROR);
    }

    if (!VALID_ENVIRONMENTS.includes(requestedEnvironment)) {
        return res.status(401).json(AUTH_ERROR);
    }

    try {
        const credential = await DeveloperCredential.findOne({ apiKey }).select('+secretHash');

        if (!credential || credential.environment !== requestedEnvironment || !credential.active || credential.revokedAt || (credential.expiresAt && credential.expiresAt <= new Date())) {
            logFailure(req, credential, 'Invalid, inactive, or expired API credential');
            return res.status(401).json(AUTH_ERROR);
        }

        const validSecret = await verifySecret(apiSecret, credential.secretHash);
        if (!validSecret) {
            logFailure(req, credential, 'Invalid API secret');
            return res.status(401).json(AUTH_ERROR);
        }

        req.user = { id: credential.userId.toString(), role: 'merchant-api' };
        req.apiCredential = credential;
        const update = { lastUsedAt: new Date() };
        if (!credential.secretHash.startsWith('scrypt$')) update.secretHash = await hashSecret(apiSecret);
        await DeveloperCredential.updateOne({ _id: credential._id }, { $set: update });

        // A successful request's outcome (status/response time/IP/etc.) is
        // recorded by middleware/apiRequestMetrics.js, mounted right after
        // this middleware on every merchant API route - not duplicated here.
        return next();
    } catch (error) {
        console.error('merchantApiAuth failed');
        return res.status(401).json(AUTH_ERROR);
    }
};

const requireApiScope = (scope) => (req, res, next) => {
    if (!req.apiCredential?.scopes?.includes(scope)) {
        return res.status(403).json({ msg: 'Insufficient API permission' });
    }
    return next();
};

module.exports = merchantApiAuth;
module.exports.requireApiScope = requireApiScope;