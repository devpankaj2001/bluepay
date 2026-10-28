const crypto = require('crypto');
const DeveloperCredential = require('../models/DeveloperCredential');
const { hashSecret } = require('../utils/developerCredentialSecurity');
const { logActivity } = require('../utils/activityLogger');
const KYC = require('../models/KYC');

const createCredentialPair = (environment) => {
    const prefix = environment === 'live' ? 'bp_live' : 'bp_test';
    const apiKey = `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
    const secret = `bps_${crypto.randomBytes(32).toString('hex')}`;
    return { apiKey, secret };
};

const toPublicCredential = (credential) => ({
    id: credential._id,
    environment: credential.environment,
    apiKey: credential.apiKey,
    secretLast4: credential.secretLast4,
    scopes: credential.scopes,
    active: credential.active,
    createdAt: credential.createdAt,
    lastRotatedAt: credential.lastRotatedAt,
    lastUsedAt: credential.lastUsedAt,
    revokedAt: credential.revokedAt,
    expiresAt: credential.expiresAt,
});

const getUserId = (req) => req.user.id || req.user._id;

/**
 * `_list`/`_rotate`/`_revoke` are the ONE implementation of credential
 * management, parameterized by an already-resolved `userId` - they never
 * trust a userId supplied in a request body/query. Merchant routes resolve
 * that id from the merchant's own JWT (`req.user.id`); admin routes
 * resolve it from `req.params.userId` only after
 * middleware/requireManagedMerchant.js has verified that id is a real,
 * non-superadmin user.
 */

const _listCredentials = async (userId) => {
    const credentials = await DeveloperCredential.find({ userId }).sort({ environment: 1 }).lean();
    return { statusCode: 200, body: { credentials: credentials.map(toPublicCredential) } };
};

const _rotateCredential = async (userId, environment) => {
    if (!['test', 'live'].includes(environment)) {
        return { statusCode: 400, body: { msg: 'Environment must be test or live' } };
    }

    const kyc = await KYC.findOne({ userId }).select('status').lean();
    if (kyc?.status !== 'approved') {
        return { statusCode: 403, body: { msg: 'KYC verification is required before generating API credentials' } };
    }

    const pair = createCredentialPair(environment);
    pair.secretHash = await hashSecret(pair.secret);

    const credential = await DeveloperCredential.findOneAndUpdate(
        { userId, environment },
        {
            $set: { apiKey: pair.apiKey, secretHash: pair.secretHash, secretLast4: pair.secret.slice(-4), lastRotatedAt: new Date(), lastUsedAt: null, revokedAt: null, active: true },
            $setOnInsert: { userId, environment, scopes: ['payouts:read', 'payouts:write', 'wallet:read'] },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return {
        statusCode: 201,
        body: { credential: toPublicCredential(credential), secret: pair.secret },
        activity: { action: 'API_CREDENTIAL_ROTATED', description: `API credential rotated (${environment})`, metadata: { secretLast4: pair.secret.slice(-4) } },
        environment,
        credentialId: credential._id,
    };
};

const _revokeCredential = async (userId, environment) => {
    if (!['test', 'live'].includes(environment)) {
        return { statusCode: 400, body: { msg: 'Environment must be test or live' } };
    }

    const credential = await DeveloperCredential.findOneAndUpdate(
        { userId, environment },
        { $set: { active: false, revokedAt: new Date() } },
        { new: true }
    );

    if (!credential) {
        return { statusCode: 404, body: { msg: 'Credentials not found' } };
    }

    return {
        statusCode: 200,
        body: { credential: toPublicCredential(credential) },
        activity: { action: 'API_CREDENTIAL_REVOKED', description: `API credential revoked (${environment})` },
        environment,
        credentialId: credential._id,
    };
};

// ---------------------------------------------------------------------
// MERCHANT routes: userId always comes from the merchant's own JWT.
// ---------------------------------------------------------------------

exports.listCredentials = async (req, res) => {
    try {
        const result = await _listCredentials(getUserId(req));
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('listCredentials:', error.message);
        return res.status(500).json({ msg: 'Failed to load developer credentials' });
    }
};

exports.rotateCredential = async (req, res) => {
    try {
        const userId = getUserId(req);
        const result = await _rotateCredential(userId, req.params.environment);
        if (result.activity) {
            logActivity({ userId, type: 'USER_ACTIVITY', ...result.activity, resourceType: 'DEVELOPER_CREDENTIAL', resourceId: result.credentialId, req, environment: result.environment });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('rotateCredential:', error.message);
        return res.status(500).json({ msg: 'Failed to generate developer credentials' });
    }
};

exports.revokeCredential = async (req, res) => {
    try {
        const userId = getUserId(req);
        const result = await _revokeCredential(userId, req.params.environment);
        if (result.activity) {
            logActivity({ userId, type: 'USER_ACTIVITY', ...result.activity, resourceType: 'DEVELOPER_CREDENTIAL', resourceId: result.credentialId, req, environment: result.environment });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('revokeCredential:', error.message);
        return res.status(500).json({ msg: 'Failed to revoke developer credentials' });
    }
};

// ---------------------------------------------------------------------
// ADMIN routes: userId comes from req.targetUserId, set by
// middleware/requireManagedMerchant.js after verifying req.params.userId
// is a real, non-superadmin user. The admin's own id (req.user.id) is
// never used to select whose credentials are shown.
// ---------------------------------------------------------------------

exports.adminListCredentials = async (req, res) => {
    try {
        const result = await _listCredentials(req.targetUserId);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('adminListCredentials:', error.message);
        return res.status(500).json({ msg: 'Failed to load developer credentials' });
    }
};

exports.adminRotateCredential = async (req, res) => {
    try {
        const result = await _rotateCredential(req.targetUserId, req.params.environment);
        if (result.activity) {
            logActivity({ userId: req.targetUserId, type: 'USER_ACTIVITY', ...result.activity, description: `${result.activity.description} by admin`, resourceType: 'DEVELOPER_CREDENTIAL', resourceId: result.credentialId, req, environment: result.environment, metadata: { ...result.activity.metadata, adminId: (req.user.id || req.user._id).toString() } });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('adminRotateCredential:', error.message);
        return res.status(500).json({ msg: 'Failed to generate developer credentials' });
    }
};

exports.adminRevokeCredential = async (req, res) => {
    try {
        const result = await _revokeCredential(req.targetUserId, req.params.environment);
        if (result.activity) {
            logActivity({ userId: req.targetUserId, type: 'USER_ACTIVITY', ...result.activity, description: `${result.activity.description} by admin`, resourceType: 'DEVELOPER_CREDENTIAL', resourceId: result.credentialId, req, environment: result.environment, metadata: { adminId: (req.user.id || req.user._id).toString() } });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('adminRevokeCredential:', error.message);
        return res.status(500).json({ msg: 'Failed to revoke developer credentials' });
    }
};
