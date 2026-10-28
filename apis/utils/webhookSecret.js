const crypto = require('crypto');

const getEncryptionKey = () => {
    const configuredKey = process.env.WEBHOOK_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!configuredKey) throw new Error('Webhook encryption key is not configured');
    return crypto.createHash('sha256').update(configuredKey).digest();
};

const encryptSecret = (secret) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
};

const decryptSecret = (value) => {
    const [ivValue, tagValue, ciphertextValue] = String(value || '').split('.');
    if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Invalid encrypted webhook secret');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, 'base64')),
        decipher.final(),
    ]).toString('utf8');
};

module.exports = { encryptSecret, decryptSecret };