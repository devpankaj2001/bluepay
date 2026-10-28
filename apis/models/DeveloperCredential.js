const mongoose = require('mongoose');

const developerCredentialSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    environment: { type: String, enum: ['test', 'live'], required: true },
    apiKey: { type: String, required: true, unique: true },
    secretHash: { type: String, required: true },
    secretLast4: { type: String, required: true },
    scopes: {
        type: [{ type: String, enum: ['payouts:read', 'payouts:write', 'wallet:read'] }],
        default: ['payouts:read', 'payouts:write', 'wallet:read'],
    },
    active: { type: Boolean, default: true },
    lastRotatedAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
}, { timestamps: true });

developerCredentialSchema.index({ userId: 1, environment: 1 }, { unique: true });

module.exports = mongoose.model('DeveloperCredential', developerCredentialSchema);