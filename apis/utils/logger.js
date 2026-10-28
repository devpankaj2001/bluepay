/**
 * Minimal structured logger.
 *
 * The project has no logging library (no winston/pino), so this wraps
 * console.log/console.error with a consistent JSON shape and a redaction
 * helper, so provider/payout logs never leak secrets or full account
 * numbers by accident.
 */

const SENSITIVE_KEYS = new Set([
    "client_secret",
    "clientsecret",
    "clientSecret",
    "api_key",
    "apikey",
    "apiKey",
    "access_token",
    "accessToken",
    "token",
    "password",
    "secret",
    "authorization",
    "private_key",
    "privateKey",
    "cert",
    "certificate",
    "account_number",
    "accountNumber",
]);

const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return accountNumber;
    const str = String(accountNumber);
    if (str.length <= 4) return "****";
    return `${"*".repeat(str.length - 4)}${str.slice(-4)}`;
};

/**
 * Deep-redacts anything that looks like a secret before it is logged.
 * account_number is masked (last 4 kept) rather than fully redacted, since
 * that's useful for support/reconciliation without exposing the full PAN.
 */
const redact = (value) => {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value)) {
        return value.map(redact);
    }

    if (typeof value === "object") {
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            const lowerKey = key.toLowerCase();

            if (lowerKey.includes("account") && lowerKey.includes("number")) {
                out[key] = maskAccountNumber(val);
            } else if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lowerKey)) {
                out[key] = "[REDACTED]";
            } else if (typeof val === "object" && val !== null) {
                out[key] = redact(val);
            } else {
                out[key] = val;
            }
        }
        return out;
    }

    return value;
};

const write = (level, event, fields = {}) => {
    const line = {
        level,
        event,
        timestamp: new Date().toISOString(),
        ...redact(fields),
    };

    const serialized = JSON.stringify(line);

    if (level === "error") {
        console.error(serialized);
    } else {
        console.log(serialized);
    }
};

module.exports = {
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields),
    redact,
    maskAccountNumber,
};
