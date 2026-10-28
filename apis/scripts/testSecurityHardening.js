const assert = require('assert/strict');

process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://merchant.example.com';
process.env.ADMIN_URL = 'https://admin.example.com';
process.env.WEBHOOK_ENCRYPTION_KEY = 'test-only-webhook-encryption-key';
process.env.JWT_SECRET = 'test-only-jwt-secret';
process.env.RATE_LIMIT_PUBLIC_MAX = '1';
process.env.RATE_LIMIT_PUBLIC_WINDOW_MS = '60000';

const http = require('http');
const express = require('express');
const cors = require('cors');
const { isOriginAllowed } = require('../config/security');
const { publicLimiter } = require('../config/security');
const { validateMerchantPayout } = require('../middleware/inputValidation');
const { validateWebhookUrl } = require('../utils/webhookSecurity');
const { encryptSecret, decryptSecret } = require('../utils/webhookSecret');
const merchantApiAuth = require('../middleware/merchantApiAuth');

const response = () => {
    const result = { statusCode: null, body: null };
    return {
        result,
        status(code) { result.statusCode = code; return this; },
        json(body) { result.body = body; return this; },
    };
};

const runMiddleware = (middleware, req) => new Promise((resolve) => {
    const res = response();
    let completed = false;
    const finish = (value) => {
        if (!completed) {
            completed = true;
            resolve(value);
        }
    };
    middleware(req, res, () => finish({ next: true, res: res.result }));
    setImmediate(() => finish({ next: false, res: res.result }));
});

(async () => {
    assert.equal(isOriginAllowed('https://merchant.example.com'), true);
    assert.equal(isOriginAllowed('https://attacker.example.com'), false);

    const unsafeUrl = await validateWebhookUrl('http://127.0.0.1:8080/hook');
    assert.equal(unsafeUrl.valid, false);

    const secret = 'whsec_test_secret';
    assert.equal(decryptSecret(encryptSecret(secret)), secret);

    let validationResponse = response();
    validateMerchantPayout(
        { body: { amount: 1, beneficiary_name: 'Merchant', account_number: '12', ifsc_code: 'bad' } },
        validationResponse,
        () => { throw new Error('Malformed payout was accepted'); }
    );
    assert.equal(validationResponse.result.statusCode, 400);

    const authResult = await runMiddleware(merchantApiAuth, { header: () => undefined });
    assert.equal(authResult.res.statusCode, 401);
    assert.deepEqual(authResult.res.body, { msg: 'Invalid API credentials' });

    const app = express();
    app.use(cors({
        origin: (origin, callback) => isOriginAllowed(origin) ? callback(null, true) : callback(new Error('Origin not allowed by CORS')),
    }));
    app.get('/limited', publicLimiter, (req, res) => res.json({ ok: true }));
    app.use((error, req, res, next) => res.status(error.message === 'Origin not allowed by CORS' ? 403 : 500).json({ msg: 'safe error' }));
    const server = await new Promise((resolve) => {
        const listener = app.listen(0, () => resolve(listener));
    });
    const request = (origin) => new Promise((resolve, reject) => {
        const requestOptions = { port: server.address().port, path: '/limited', headers: { Origin: origin } };
        const requestHandle = http.get(requestOptions, (response) => {
            response.resume();
            response.on('end', () => resolve(response.statusCode));
        });
        requestHandle.on('error', reject);
    });
    assert.equal(await request('https://attacker.example.com'), 403);
    assert.equal(await request('https://merchant.example.com'), 200);
    assert.equal(await request('https://merchant.example.com'), 429);
    await new Promise((resolve) => server.close(resolve));

    console.log('Security hardening checks passed');
})().catch((error) => {
    console.error('Security hardening checks failed:', error.message);
    process.exitCode = 1;
});
