/**
 * Kotak CMS Generic Payments API configuration.
 *
 * Source of truth: "CMS Generic Payment API specification v5.4" and the
 * "CMS Generic API FCMS 4.6" Postman collection from the official kit.
 *
 * PAYOUT_PROVIDER_MODE:
 *   - "mock" (default): mockKotakAdapter.js
 *   - "live": kotakClient.js (real Kotak UAT/PROD calls)
 *
 * The kit documents ONLY OAuth (client_credentials) + Bearer token + AES
 * payload encryption keyed by the client secret. It documents no mTLS, no
 * client certificate and no API key for /v1/cms/pay, so KOTAK_CERT_PATH,
 * KOTAK_KEY_PATH and KOTAK_API_KEY are intentionally NOT required.
 */

const getMode = () => (process.env.PAYOUT_PROVIDER_MODE || "mock").toLowerCase();

const isLiveMode = () => getMode() === "live";

// Documented paths (spec v5.4 sections 2.3, 4.2, 5.2).
const TOKEN_PATH = "/auth/oauth/v2/token";
const PAYMENT_PATH = "/v1/cms/pay";
const STATUS_PATH = "/v1/cms/rev";

/**
 * Tolerates a mis-pasted value such as "KOTAK_BASE_URL=https://host:8443"
 * and a trailing slash. Returns host[:port] with scheme, no path.
 */
const normalizeBaseUrl = (value) => {
    if (!value) return null;
    let v = String(value).trim().replace(/^KOTAK_BASE_URL\s*=\s*/i, "");
    v = v.replace(/\/+$/, "");
    return v || null;
};

const orNull = (v) => (v && String(v).trim() ? String(v).trim() : null);

/** Never log the return value of this function. */
const getRawConfig = () => {
    const baseUrl = normalizeBaseUrl(process.env.KOTAK_BASE_URL);
    return {
        baseUrl,
        // Token and payment URLs are kept separate; each may be overridden.
        tokenUrl: orNull(process.env.KOTAK_TOKEN_URL) || (baseUrl ? baseUrl + TOKEN_PATH : null),
        paymentUrl: orNull(process.env.KOTAK_PAYMENT_URL) || (baseUrl ? baseUrl + PAYMENT_PATH : null),
        statusUrl: orNull(process.env.KOTAK_STATUS_URL) || (baseUrl ? baseUrl + STATUS_PATH : null),
        clientId: orNull(process.env.KOTAK_CLIENT_ID),
        // Doc: "Client Secret key will be used as encryption key".
        clientSecret: orNull(process.env.KOTAK_CLIENT_SECRET),
        accountNumber: orNull(process.env.KOTAK_ACCOUNT_NUMBER), // debit account (AccountNo)
        clientCode: orNull(process.env.KOTAK_CLIENT_CODE), // ClientCode, assigned by the bank
        msgSource: orNull(process.env.KOTAK_MSG_SOURCE) || orNull(process.env.KOTAK_CLIENT_CODE),
        myProdCode: orNull(process.env.KOTAK_MY_PROD_CODE), // doc: "CMSPAY" in UAT
        companyId: orNull(process.env.KOTAK_COMPANY_ID),
        bankCdInd: orNull(process.env.KOTAK_BANK_CD_IND), // manager payload: "M"
        payModeMode: (orNull(process.env.KOTAK_PAYMODE_MODE) || "omit").toLowerCase(), // omit | auto
    };
};

/** Required env vars that are unset (names are env var names). */
const missingConfigKeys = () => {
    const raw = getRawConfig();
    const required = {
        KOTAK_BASE_URL: raw.baseUrl || (raw.tokenUrl && raw.paymentUrl && raw.statusUrl),
        KOTAK_CLIENT_ID: raw.clientId,
        KOTAK_CLIENT_SECRET: raw.clientSecret,
        KOTAK_ACCOUNT_NUMBER: raw.accountNumber,
        KOTAK_CLIENT_CODE: raw.clientCode,
        KOTAK_MY_PROD_CODE: raw.myProdCode,
    };
    return Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
};

module.exports = {
    TOKEN_PATH,
    PAYMENT_PATH,
    STATUS_PATH,
    getMode,
    isLiveMode,
    getRawConfig,
    missingConfigKeys,
};
