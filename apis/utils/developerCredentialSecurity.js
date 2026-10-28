const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const SCRYPT_PREFIX = 'scrypt$';

const hashSecret = async (secret) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scrypt(secret, salt, 64);
    return `${SCRYPT_PREFIX}${salt}$${derivedKey.toString('hex')}`;
};

const safeEqualHex = (left, right) => {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifySecret = async (secret, storedHash) => {
    if (storedHash.startsWith(SCRYPT_PREFIX)) {
        const [, salt, expectedKey] = storedHash.split('$');
        const derivedKey = await scrypt(secret, salt, 64);
        return safeEqualHex(derivedKey.toString('hex'), expectedKey);
    }

    // Compatibility for credentials generated before scrypt was introduced.
    const legacyHash = crypto.createHash('sha256').update(secret).digest('hex');
    return safeEqualHex(legacyHash, storedHash);
};

module.exports = { hashSecret, verifySecret };