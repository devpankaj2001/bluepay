/**
 * Kotak CMS Generic Payments API client (live mode).
 *
 * Everything here is taken from the official kit:
 *   - "CMS Generic Payment API specification v5.4" (endpoints, fields, codes)
 *   - "CMS Generic API FCMS 4.6 V1.2" Postman collection (headers, body form)
 *   - "java encryption Payments/Reversal call Encrypt Decrypt.txt" (crypto)
 *
 * Flow: build SOAP/XML -> AES encrypt -> base64 string as RAW request body
 * -> POST with Bearer token -> response body is base64 AES ciphertext.
 *
 * NOT in the kit (do not invent): Payment_Request.xsd, HeaderChecksum
 * algorithm, mTLS/client certificates, API key for /v1/cms/pay.
 */

const crypto = require("crypto");
const https = require("https");
const { URL } = require("url");

const kotakConfig = require("./kotakConfig");
const providerResponse = require("../providerResponse");
const { writeKotakApiAudit } = require("./kotakAuditLogger");
const logger = require("../../../utils/logger");

class KotakNotImplementedError extends Error {
    constructor(missingKeys) {
        super(`Kotak live client is missing required configuration: ${(missingKeys || []).join(", ")}`);
        this.name = "KotakNotImplementedError";
        this.code = "KOTAK_CLIENT_NOT_CONFIGURED";
    }
}

class KotakHttpError extends Error {
    constructor(message, extra = {}) {
        super(message);
        this.name = "KotakHttpError";
        Object.assign(this, extra);
    }
}

const REQUEST_TIMEOUT_MS = 30000;
const NS_PAY = "http://www.kotak.com/schemas/CMS_Generic/Payment_Request.xsd";
const NS_REV = "http://www.kotak.com/schemas/CMS_Generic/Reversal_Request.xsd";
const NS_SOAP = "http://www.w3.org/2003/05/soap-envelope";
const SOAP_ACTION_PAY = '"/BusinessServices/StarterProcesses/CMS_Generic_Service.serviceagent/Payment"';
const SOAP_ACTION_REV = '"/BusinessServices/StarterProcesses/CMS_Generic_Service.serviceagent/Reversal"';

const requireConfig = () => {
    const missing = kotakConfig.missingConfigKeys();
    if (missing.length) throw new KotakNotImplementedError(missing);
    return kotakConfig.getRawConfig();
};

// ---------------------------------------------------------------------------
// Encryption (mirrors AESCBCPKCS5Encryption from the kit exactly)
//   AES/CBC/PKCS5Padding, key = UTF-8 bytes of client secret (32 chars ->
//   AES-256), IV = 16 zero bytes, plaintext = 16 zero bytes || XML(UTF-8),
//   output = Base64. Decrypt: IV = first 16 bytes of ciphertext.
// ---------------------------------------------------------------------------

const aesAlgorithmForKey = (key) => {
    const bits = { 16: "aes-128-cbc", 24: "aes-192-cbc", 32: "aes-256-cbc" }[key.length];
    if (!bits) throw new Error(`Kotak encryption key must be 16/24/32 bytes, got ${key.length}`);
    return bits;
};

const getEncryptionKey = (secret) => {
    const s = secret !== undefined ? secret : kotakConfig.getRawConfig().clientSecret;
    if (!s) throw new KotakNotImplementedError(["KOTAK_CLIENT_SECRET"]);
    return Buffer.from(s, "utf8");
};

const encryptKotakPaymentXml = (xml, secret) => {
    if (xml == null) throw new Error("text to be encrypted should not be null");
    const key = getEncryptionKey(secret);
    const iv = Buffer.alloc(16);
    const cipher = crypto.createCipheriv(aesAlgorithmForKey(key), key, iv);
    const plain = Buffer.concat([Buffer.alloc(16), Buffer.from(String(xml), "utf8")]);
    return Buffer.concat([cipher.update(plain), cipher.final()]).toString("base64");
};

const decryptKotakResponse = (payload, secret) => {
    if (payload == null) throw new Error("text to be decrypted should not be null");
    const key = getEncryptionKey(secret);
    const raw = Buffer.from(String(payload).trim(), "base64");
    if (raw.length < 32 || raw.length % 16 !== 0) throw new Error("Not a valid Kotak encrypted payload");
    const decipher = crypto.createDecipheriv(aesAlgorithmForKey(key), key, raw.subarray(0, 16));
    return Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString("utf8");
};

// ---------------------------------------------------------------------------
// Payment XML (field order/lengths from spec v5.4 section 4.3 + sample XML)
// ---------------------------------------------------------------------------

// [tag, maxLength, mandatory] in documented order.
const HEADER_FIELDS = [
    ["MessageId", 20, false],
    ["MsgSource", 20, true],
    ["ClientCode", 10, true],
    ["BatchRefNmbr", 20, false],
];
const INSTRUMENT_FIELDS = [
    ["InstRefNo", 20, true],
    ["CompanyId", 20, false],
    ["CompBatchId", 20, false],
    ["ConfidentialInd", 1, false],
    ["MyProdCode", 20, true],
    ["CompTransNo", 20, false],
    ["PayMode", 10, false],
    ["TxnAmnt", 14, true], // Number(11,2)
    ["AccountNo", 20, true],
    ["DrRefNmbr", 14, false],
    ["DrDesc", 140, false],
    ["PaymentDt", 10, false],
    ["BankCdInd", 1, false],
    ["BeneBnkCd", 10, false],
    ["RecBrCd", 11, false],
    ["BeneAcctNo", 30, false],
    ["BeneName", 200, false],
    ["BeneCode", 50, false],
    ["BeneEmail", 255, false],
    ["BeneFax", 40, false],
    ["BeneMb", 12, false],
    ["BeneAddr1", 150, false],
    ["BeneAddr2", 35, false],
    ["BeneAddr3", 35, false],
    ["BeneAddr4", 35, false],
    ["BeneAddr5", 35, false],
    ["city", 30, false],
    ["zip", 10, false],
    ["Country", 60, false],
    ["State", 60, false],
    ["TelephoneNo", 20, false],
    ["BeneId", 20, false],
    ["BeneTaxId", 20, false],
    ["AuthPerson", 40, false],
    ["AuthPersonId", 15, false],
    ["DeliveryMode", 2, false],
    ["PayoutLoc", 10, false],
    ["PickupBr", 10, false],
    ["PaymentRef", 45, false],
    ["ChgBorneBy", 1, false],
    ["InstDt", 10, false],
    ["MICRNo", 6, false],
    ["CreditRefNo", 45, false],
    ["PaymentDtl", 140, false],
    ["PaymentDtl1", 200, false],
    ["PaymentDtl2", 200, false],
    ["PaymentDtl3", 200, false],
    ["MailToAddr1", 200, false],
    ["MailToAddr2", 200, false],
    ["MailToAddr3", 200, false],
    ["MailToAddr4", 200, false],
    ["MailTo", 200, false],
    ["ExchDoc", 30, false],
];
const ENRICHMENT_MAX = 4000;

const escapeXml = (v) =>
    String(v)
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

const formatDate = (d) => {
    const dt = d instanceof Date ? d : d ? new Date(d) : new Date();
    if (Number.isNaN(dt.getTime())) throw new Error("Invalid payment date");
    // Bank business date is India time; UTC would give the previous day before 05:30 IST.
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(dt); // YYYY-MM-DD
};

const formatAmount = (amount) => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) throw new Error("TxnAmnt must be greater than 0");
    const s = n.toFixed(2);
    if (s.replace(".", "").length > 11) throw new Error("TxnAmnt exceeds Number(11,2)");
    return s;
};

/**
 * Kotak MessageId / InstRefNo are max 20 chars; BluePay provider references
 * are longer. Derive a deterministic 16-char id so retries reuse the same
 * value (Kotak dedupes on ClientCode + MessageId + InstRefNo).
 */
const toKotakId = (providerReference) =>
    "BP" + crypto.createHash("sha256").update(String(providerReference)).digest("hex").toUpperCase().slice(0, 14); // 16 chars; leaves room for the "_A" CompBatchId suffix (max 20)

/**
 * Documented PayMode guidance (spec 4.3): Kotak->Kotak IFT; other bank
 * below 2 lakh NEFT; 2 lakh and above RTGS. (IMPS only for IMPS-enabled
 * IFSCs - not selected automatically.)
 */
const derivePayMode = (ifsc, amount) => {
    if (/^KKBK/i.test(ifsc || "")) return "IFT";
    return Number(amount) < 200000 ? "NEFT" : "RTGS";
};

/**
 * @param {object} payout
 *  providerReference | messageId, amount, beneficiaryName, accountNumber,
 *  ifscCode, [email, mobile, address1, address2, city, zip, state, country,
 *  narration, paymentDate, payMode], [config] (override for tests)
 * @returns {{xml:string, messageId:string, instRefNo:string}}
 */
const buildKotakPaymentXml = (payout, configOverride) => {
    const cfg = configOverride || requireConfig();
    const messageId = payout.messageId || toKotakId(payout.providerReference);
    const instRefNo = payout.instRefNo || messageId;

    const header = {
        MessageId: messageId,
        MsgSource: cfg.msgSource || cfg.clientCode,
        ClientCode: cfg.clientCode,
        BatchRefNmbr: messageId,
    };
    const inst = {
        InstRefNo: instRefNo,
        CompanyId: cfg.companyId,
        CompBatchId: payout.compBatchId || `${messageId}_A`, // manager/sample pattern: <MessageId>_A
        ConfidentialInd: "N",
        MyProdCode: cfg.myProdCode,
        // PayMode is optional and, when sent, triggers bank-product validation (spec 4.3).
        // The manager payload omits it (product BBPACKAGE decides), so default is omit.
        PayMode: payout.payMode || (cfg.payModeMode === "auto" ? derivePayMode(payout.ifscCode, payout.amount) : undefined),
        TxnAmnt: formatAmount(payout.amount),
        AccountNo: cfg.accountNumber,
        PaymentDt: formatDate(payout.paymentDate),
        BankCdInd: cfg.bankCdInd,
        RecBrCd: payout.ifscCode && String(payout.ifscCode).toUpperCase(),
        BeneAcctNo: payout.accountNumber,
        BeneName: payout.beneficiaryName,
        BeneEmail: payout.email,
        BeneMb: payout.mobile,
        BeneAddr1: payout.address1,
        BeneAddr2: payout.address2,
        city: payout.city,
        zip: payout.zip,
        Country: payout.country,
        State: payout.state,
        PaymentRef: payout.narration,
        ...(payout.extraFields || {}),
    };

    const emit = (fields, values, indent) => {
        const lines = [];
        for (const [tag, max, mandatory] of fields) {
            const raw = values[tag];
            const has = raw !== undefined && raw !== null && String(raw) !== "";
            if (!has) {
                if (mandatory) throw new Error(`Kotak field ${tag} is mandatory`);
                continue;
            }
            const val = String(raw);
            if (val.length > max) throw new Error(`Kotak field ${tag} exceeds max length ${max} (got ${val.length})`);
            lines.push(`${indent}<pay:${tag}>${escapeXml(val)}</pay:${tag}>`);
        }
        return lines.join("\n");
    };

    const enrichments = (payout.enrichments || []).filter((e) => e !== undefined && e !== null && String(e).trim() !== "").map((e) => {
        if (String(e).length > ENRICHMENT_MAX) throw new Error("Enrichment exceeds 4000 chars");
        return `                        <pay:Enrichment>${escapeXml(e)}</pay:Enrichment>`;
    });
    const enrichmentBlock = enrichments.length
        ? `\n                    <pay:EnrichmentSet>\n${enrichments.join("\n")}\n                    </pay:EnrichmentSet>`
        : "";

    const xml =
        `<soap:Envelope xmlns:soap="${NS_SOAP}" xmlns:pay="${NS_PAY}">\n` +
        `    <soap:Header/>\n    <soap:Body>\n        <pay:Payment>\n            <pay:RequestHeader>\n` +
        `${emit(HEADER_FIELDS, header, "                ")}\n` +
        `            </pay:RequestHeader>\n            <pay:InstrumentList>\n                <pay:instrument>\n` +
        `${emit(INSTRUMENT_FIELDS, inst, "                    ")}${enrichmentBlock}\n` +
        `                </pay:instrument>\n            </pay:InstrumentList>\n        </pay:Payment>\n    </soap:Body>\n</soap:Envelope>`;

    return { xml, messageId, instRefNo };
};

/**
 * Structural validation against the documented rules. The official
 * Payment_Request.xsd is NOT in the kit, so this cannot be a true XSD
 * validation: it checks namespace, root structure, element order, mandatory
 * fields, max lengths, amount and date formats from spec v5.4 sec. 4.3.
 * @returns {{valid:boolean, errors:string[]}}
 */
const validateKotakPaymentXml = (xml) => {
    const errors = [];
    if (!xml.includes(`xmlns:pay="${NS_PAY}"`)) errors.push("Missing/incorrect pay namespace");
    if (!xml.includes(`xmlns:soap="${NS_SOAP}"`)) errors.push("Missing/incorrect soap namespace");
    for (const t of ["soap:Envelope", "soap:Body", "pay:Payment", "pay:RequestHeader", "pay:InstrumentList", "pay:instrument"]) {
        if (!xml.includes(`<${t}`) || !xml.includes(`</${t}>`)) errors.push(`Missing element ${t}`);
    }
    const section = (name) => {
        const m = xml.match(new RegExp(`<pay:${name}>([\\s\\S]*?)</pay:${name}>`));
        return m ? m[1] : "";
    };
    const check = (fields, body, label) => {
        let lastIdx = -1;
        for (const [tag, max, mandatory] of fields) {
            const m = body.match(new RegExp(`<pay:${tag}>([\\s\\S]*?)</pay:${tag}>`));
            if (!m) {
                if (mandatory) errors.push(`${label}: mandatory ${tag} missing`);
                continue;
            }
            const idx = body.indexOf(`<pay:${tag}>`);
            if (idx < lastIdx) errors.push(`${label}: ${tag} out of documented order`);
            lastIdx = idx;
            const decoded = m[1].replace(/&lt;|&gt;|&quot;|&apos;|&amp;/g, "x");
            if (decoded.length > max) errors.push(`${label}: ${tag} exceeds ${max}`);
        }
    };
    check(HEADER_FIELDS, section("RequestHeader"), "RequestHeader");
    const inst = section("instrument");
    check(INSTRUMENT_FIELDS, inst, "instrument");
    const amt = (inst.match(/<pay:TxnAmnt>(.*?)<\/pay:TxnAmnt>/) || [])[1];
    if (amt && !/^\d{1,9}(\.\d{1,2})?$/.test(amt)) errors.push("TxnAmnt must be Number(11,2)");
    if (amt && Number(amt) <= 0) errors.push("TxnAmnt must be > 0");
    const dt = (inst.match(/<pay:PaymentDt>(.*?)<\/pay:PaymentDt>/) || [])[1];
    if (dt && !/^\d{4}-\d{2}-\d{2}$/.test(dt)) errors.push("PaymentDt must be YYYY-MM-DD");
    return { valid: errors.length === 0, errors };
};

const buildKotakStatusXml = ({ messageId, instRefNo }, configOverride) => {
    const cfg = configOverride || requireConfig();
    const reqId = "ST" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString("hex").toUpperCase();
    const details = instRefNo
        ? `            <rev:MsgInstRef>\n                <rev:Msg_Id>${escapeXml(messageId)}</rev:Msg_Id>\n                <rev:InstRefNo>${escapeXml(instRefNo)}</rev:InstRefNo>\n            </rev:MsgInstRef>`
        : `            <rev:Details>\n                <rev:Msg_Id>${escapeXml(messageId)}</rev:Msg_Id>\n            </rev:Details>`;
    return (
        `<soap:Envelope xmlns:soap="${NS_SOAP}" xmlns:rev="${NS_REV}">\n    <soap:Header/>\n    <soap:Body>\n        <rev:Reversal>\n` +
        `            <rev:Header>\n                <rev:Req_Id>${reqId.slice(0, 20)}</rev:Req_Id>\n` +
        `                <rev:Msg_Src>${escapeXml(cfg.msgSource || cfg.clientCode)}</rev:Msg_Src>\n` +
        `                <rev:Client_Code>${escapeXml(cfg.clientCode)}</rev:Client_Code>\n` +
        `                <rev:Date_Post>${formatDate()}</rev:Date_Post>\n            </rev:Header>\n` +
        `${details}\n        </rev:Reversal>\n    </soap:Body>\n</soap:Envelope>`
    );
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const httpRequest = ({ url, method = "POST", headers = {}, body }) =>
    new Promise((resolve, reject) => {
        const requestTimestamp = new Date();
        const startedAt = Date.now();
        const u = new URL(url);
        const data = body == null ? null : Buffer.from(body, "utf8");
        const requestHeaders = { ...headers, ...(data ? { "Content-Length": data.length } : {}) };
        const req = https.request(
            {
                method,
                hostname: u.hostname,
                port: u.port || 443,
                path: u.pathname + u.search,
                headers: requestHeaders,
                timeout: REQUEST_TIMEOUT_MS,
            },
            (res) => {
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => {
                    let buf = Buffer.concat(chunks);
                    if (res.headers["content-encoding"] === "gzip") {
                        try { buf = require("zlib").gunzipSync(buf); } catch (_) { /* keep raw */ }
                    }
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: buf.toString("utf8"),
                        requestTimestamp,
                        responseTimestamp: new Date(),
                        durationMs: Date.now() - startedAt,
                        requestHeaders,
                    });
                });
            }
        );
        req.on("timeout", () => {
            const err = new KotakHttpError("Kotak request timed out", { isTimeout: true, code: "ETIMEDOUT" });
            req.destroy(err);
        });
        req.on("error", (error) => {
            error.kotakTiming = {
                requestTimestamp,
                responseTimestamp: new Date(),
                durationMs: Date.now() - startedAt,
            };
            error.kotakRequestHeaders = requestHeaders;
            reject(error);
        });
        if (data) req.write(data);
        req.end();
    });

let tokenCache = { token: null, expiresAt: 0 };

const auditEnvironment = (url) => {
    try {
        if (/uat/i.test(new URL(url).hostname)) return "uat";
        if (/sandbox|test/i.test(new URL(url).hostname)) return "test";
    } catch (_) { /* use configured mode below */ }
    return kotakConfig.isLiveMode() ? "live" : null;
};

const auditKotakTransportError = ({ apiName, url, headers, requestPayload, context = {}, error }) => {
    const timing = error.kotakTiming || {};
    const isTimeout = error.isTimeout || ["ETIMEDOUT", "ECONNABORTED"].includes(error.code);
    void writeKotakApiAudit({
        apiName,
        endpoint: url,
        method: "POST",
        environment: auditEnvironment(url),
        requestTimestamp: timing.requestTimestamp || new Date(),
        responseTimestamp: null,
        durationMs: timing.durationMs,
        httpStatus: null,
        applicationStatus: "UNKNOWN",
        requestId: context.requestId,
        messageId: context.messageId,
        transactionId: context.transactionId,
        providerReference: context.providerReference,
        requestHeaders: error.kotakRequestHeaders || headers,
        requestPayload,
        errorCode: error.code || null,
        errorType: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        errorMessage: error.message,
    });
};

/** OAuth2 client_credentials, form-urlencoded (spec 2.3). */
const getKotakAccessToken = async ({ forceRefresh = false } = {}) => {
    const cfg = kotakConfig.getRawConfig();
    const missing = [["KOTAK_BASE_URL", cfg.tokenUrl], ["KOTAK_CLIENT_ID", cfg.clientId], ["KOTAK_CLIENT_SECRET", cfg.clientSecret]].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new KotakNotImplementedError(missing);
    if (!forceRefresh && tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
    }).toString();

    const requestHeaders = { "Content-Type": "application/x-www-form-urlencoded" };
    let res;
    try {
        res = await httpRequest({ url: cfg.tokenUrl, headers: requestHeaders, body });
    } catch (error) {
        auditKotakTransportError({
            apiName: "OAuth Token API",
            url: cfg.tokenUrl,
            headers: requestHeaders,
            requestPayload: body,
            error,
        });
        throw error;
    }

    let json = null;
    try { json = JSON.parse(res.body); } catch (_) { /* not json */ }
    void writeKotakApiAudit({
        apiName: "OAuth Token API",
        endpoint: cfg.tokenUrl,
        method: "POST",
        environment: auditEnvironment(cfg.tokenUrl),
        requestTimestamp: res.requestTimestamp,
        responseTimestamp: res.responseTimestamp,
        durationMs: res.durationMs,
        httpStatus: res.status,
        applicationStatus: res.status === 200 ? (json?.access_token ? "SUCCESS" : "UNKNOWN") : res.status >= 500 ? "UNKNOWN" : "FAILED",
        requestId: res.headers?.["x-kotak-request-id"] || res.headers?.["x-request-id"] || kotakRequestId(res.body),
        requestHeaders: res.requestHeaders,
        requestPayload: body,
        responseBody: json || res.body,
        responseCode: json?.error || null,
        responseMessage: json?.error_description || null,
        errorType: res.status >= 400 ? "HTTP_ERROR" : (res.status === 200 && !json?.access_token ? "MALFORMED_RESPONSE" : null),
        errorCode: json?.error || (res.status >= 400 ? String(res.status) : (res.status === 200 && !json?.access_token ? "MALFORMED_RESPONSE" : null)),
        errorMessage: json?.error_description || (res.status >= 400 || (res.status === 200 && !json?.access_token) ? String(res.body || "OAuth response did not contain an access token").slice(0, 500) : null),
        tokenType: json?.token_type || null,
        expiresIn: Number.isFinite(Number(json?.expires_in)) ? Number(json.expires_in) : null,
    });
    if (res.status !== 200 || !json || !json.access_token) {
        throw new KotakHttpError(`Kotak OAuth failed: HTTP ${res.status} ${String(res.body).slice(0, 300)}`, {
            stage: "oauth",
            httpStatus: res.status,
        });
    }
    const ttl = Number(json.expires_in) || 3600;
    tokenCache = { token: json.access_token, expiresAt: Date.now() + Math.max(ttl - 60, 30) * 1000 };
    return json.access_token;
};

const clearTokenCache = () => { tokenCache = { token: null, expiresAt: 0 }; };

/**
 * Builds the exact request: raw body = base64 ciphertext (NOT JSON), headers
 * per Postman collection (SOAPAction, Content-Type application/xml, Bearer).
 */
const createKotakPaymentRequest = (payout, configOverride) => {
    const cfg = configOverride || requireConfig();
    const { xml, messageId, instRefNo } = buildKotakPaymentXml(payout, cfg);
    const check = validateKotakPaymentXml(xml);
    if (!check.valid) throw new Error(`Kotak payment XML failed validation: ${check.errors.join("; ")}`);
    return {
        url: cfg.paymentUrl,
        xml,
        messageId,
        instRefNo,
        body: encryptKotakPaymentXml(xml, cfg.clientSecret),
        headers: { SOAPAction: SOAP_ACTION_PAY, "Content-Type": "application/xml" },
    };
};

const looksEncrypted = (s) => /^[A-Za-z0-9+/=\s]{44,}$/.test(String(s || "")) && !String(s).trim().startsWith("<");

/** Sends an encrypted body with Bearer token; decrypts the response. */
const post = async ({ url, body, headers, audit = {} }) => {
    const cfg = kotakConfig.getRawConfig();
    const apiName = audit.apiName || (new URL(url).pathname === kotakConfig.STATUS_PATH ? "Status / Reversal API" : "Payment API");
    const requestPayload = audit.requestPayload || audit.payloadXml || {
        encryptedPayload: "[MASKED]",
        payloadType: "Base64 encrypted XML",
        encryption: "AES-CBC",
        encoding: "Base64",
        encodedLength: typeof body === "string" ? body.length : null,
    };
    const requestHeaders = { ...headers };
    const attempt = async (token) => {
        const outgoingHeaders = { ...headers, Authorization: `Bearer ${token}` };
        try {
            const response = await httpRequest({ url, body, headers: outgoingHeaders });
            let decrypted = null;
            if (looksEncrypted(response.body)) {
                try { decrypted = decryptKotakResponse(response.body, cfg.clientSecret); } catch (_) { /* leave null */ }
            } else if (String(response.body).trim().startsWith("<")) {
                decrypted = response.body;
            }
            const result = { ...response, rawBody: response.body, xml: decrypted };
            const auditDetails = kotakAuditOutcome(apiName, result, audit);
            void writeKotakApiAudit({
                apiName,
                endpoint: url,
                method: "POST",
                environment: auditEnvironment(url),
                requestTimestamp: response.requestTimestamp,
                responseTimestamp: response.responseTimestamp,
                durationMs: response.durationMs,
                httpStatus: response.status,
                ...auditDetails,
                requestId: response.headers?.["x-kotak-request-id"] || response.headers?.["x-request-id"] || kotakRequestId(response.body) || audit.requestId,
                messageId: auditDetails.messageId || audit.messageId || null,
                transactionId: auditDetails.transactionId || audit.transactionId || null,
                providerReference: audit.providerReference,
                requestHeaders: response.requestHeaders,
                requestPayload,
                responseBody: decrypted || response.body,
            });
            return result;
        } catch (error) {
            auditKotakTransportError({ apiName, url, headers: error.kotakRequestHeaders || outgoingHeaders, requestPayload, context: audit, error });
            throw error;
        }
    };

    let res = await attempt(await getKotakAccessToken());
    if (res.status === 403 && /Invalid Access Token/i.test(res.body)) {
        // Rejected at the gateway before processing, so one refresh+retry is safe.
        clearTokenCache();
        res = await attempt(await getKotakAccessToken({ forceRefresh: true }));
    }

    logger.info("kotak.http", {
        provider: "KOTAK",
        endpoint: new URL(url).pathname,
        httpStatus: res.status,
        kotakRequestId: kotakRequestId(res.body),
    });

    return res;
};

const sendKotakPayment = (request) => post({
    ...request,
    audit: {
        apiName: new URL(request.url).pathname === kotakConfig.STATUS_PATH ? "Status / Reversal API" : "Payment API",
        requestPayload: {
            encryptedPayload: "[MASKED]",
            payloadType: "Base64 encrypted XML",
            encryption: "AES-CBC",
            encoding: "Base64",
            encodedLength: request.body.length,
        },
        requestId: (request.xml?.match(/<(?:\w+:)?Req_Id>([^<]+)<\/(?:\w+:)?Req_Id>/) || [])[1] || null,
        messageId: request.messageId,
        providerReference: request.providerReference,
    },
});

/** Names the failing layer from an HTTP result (used by the UAT script/logs). */
const classifyFailure = (res) => {
    const t = String(res.rawBody || "");
    if (/Wrong IP/i.test(t)) return "IP whitelisting (Kotak Threat Protection: Wrong IP - egress IP not whitelisted)";
    if (/Invalid Access Token/i.test(t)) return "API authentication (Invalid Access Token)";
    if (/Decryption Error/i.test(t)) return "encryption (Kotak could not decrypt the body)";
    if (/Threat Protection/i.test(t)) return "Kotak Threat Protection";
    if (res.status === 403) return "Kotak gateway 403 (see body)";
    if (res.status === 401) return "API authentication";
    if (res.status >= 500) return "Kotak server/business error";
    return null;
};

const tag = (xml, name) => {
    const m = String(xml || "").match(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
    return m ? m[1].trim() : null;
};
const tagAll = (xml, name) =>
    [...String(xml || "").matchAll(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "g"))].map((m) => m[1].trim());

const kotakRequestId = (body) => ((String(body || "").match(/RequestId\s*::\s*(\S+)/) || [])[1]) || null;

const parsePaymentAck = (xml) => ({
    messageId: tag(xml, "MessageId"),
    statusCd: tag(xml, "StatusCd"),
    statusRem: tag(xml, "StatusRem"),
    instStatusCds: tagAll(xml, "InstStatusCd"),
    errors: tagAll(xml, "Error"),
    faults: tagAll(xml, "Reason"),
});

const kotakAuditOutcome = (apiName, res, audit = {}) => {
    const result = { applicationStatus: "UNKNOWN" };
    if (res.status !== 200 || !res.xml) {
        result.responseCode = res.status == null ? null : String(res.status);
        const rawBody = String(res.rawBody || "");
        result.responseMessage = looksEncrypted(rawBody)
            ? "Kotak returned an encrypted response that could not be decrypted."
            : rawBody.slice(0, 500) || classifyFailure(res) || null;
        if (res.status >= 400) {
            result.errorType = "HTTP_ERROR";
            result.errorCode = String(res.status);
            result.errorMessage = result.responseMessage;
        } else if (res.status === 200 && !res.xml) {
            result.errorType = "MALFORMED_RESPONSE";
            result.errorCode = "MALFORMED_RESPONSE";
            result.errorMessage = result.responseMessage || "Kotak response could not be parsed.";
        } else if (res.status !== 200) {
            result.errorType = "HTTP_ERROR";
            result.errorCode = String(res.status);
            result.errorMessage = result.responseMessage;
        }
        if (apiName === "Payment API" && res.status === 403 && /Decryption Error|Invalid Access Token|Wrong IP/i.test(res.rawBody || "")) {
            result.applicationStatus = "FAILED";
        }
        return result;
    }

    if (apiName === "Payment API") {
        const ack = parsePaymentAck(res.xml);
        result.messageId = ack.messageId;
        result.responseCode = ack.statusCd;
        result.responseMessage = ack.statusRem || ack.errors.join(" ") || null;
        if (ack.instStatusCds.includes("006")) result.responseCode = "006";
        try {
            result.applicationStatus = normalizePaymentResponse(res, {
                providerReference: audit.providerReference,
                messageId: audit.messageId,
            }).status || "UNKNOWN";
        } catch (error) {
            result.applicationStatus = error.isDuplicate ? "PROCESSING" : "UNKNOWN";
        }
        return result;
    }

    const code = tag(res.xml, "Status_Code");
    const description = tag(res.xml, "Status_Desc");
    result.responseCode = code;
    result.responseMessage = description;
    result.messageId = tag(res.xml, "Msg_Id") || null;
    result.transactionId = tag(res.xml, "UTR") || result.messageId;
    result.applicationStatus = STATUS_MAP[code] || "UNKNOWN";
    return result;
};

/**
 * Header status codes (spec 4.7). 000/005 mean "accepted into CMS" - NOT
 * paid; final state comes from the status (rev) API.
 */
const normalizePaymentResponse = (res, { providerReference, messageId }) => {
    const raw = { httpStatus: res.status, xml: res.xml, kotakRequestId: kotakRequestId(res.rawBody) };
    if (res.status !== 200 || !res.xml) {
        const layer = classifyFailure(res);
        // Gateway rejections happen before CMS processing -> safe to fail.
        if (res.status === 403 && /Decryption Error|Invalid Access Token|Wrong IP/i.test(res.rawBody)) {
            return providerResponse.failed({ providerReference, message: `Kotak rejected request: ${layer}`, providerResponseCode: "403", raw });
        }
        // Anything else is ambiguous (doc: on 403/other, confirm via status enquiry).
        return providerResponse.unknown({
            providerReference,
            providerTransactionId: messageId,
            message: `Kotak returned HTTP ${res.status}${layer ? ` (${layer})` : ""}; confirm via status inquiry`,
            raw,
        });
    }
    const ack = parsePaymentAck(res.xml);
    raw.ack = ack;
    if (!ack.statusCd) {
        // 2xx but no acknowledgement code: malformed/unexpected body, outcome unknown.
        return providerResponse.unknown({ providerReference, providerTransactionId: messageId, message: "Kotak returned an unparsable acknowledgement; confirm via status inquiry", raw });
    }
    const codes = [ack.statusCd, ...ack.instStatusCds];
    if (ack.statusCd === "000" || ack.statusCd === "005") {
        if (codes.includes("006")) {
            return providerResponse.failed({ providerReference, message: `Instrument rejected: ${ack.errors.join(" ")}`, providerResponseCode: "006", raw });
        }
        return providerResponse.processing({
            providerReference,
            providerTransactionId: messageId,
            message: ack.statusRem || "Accepted by Kotak CMS; awaiting final status",
            raw,
        });
    }
    if (ack.statusCd === "002") {
        const err = new Error("Kotak: Duplicate Message Id");
        err.isDuplicate = true;
        throw err;
    }
    if (ack.statusCd === "011") {
        return providerResponse.unknown({ providerReference, providerTransactionId: messageId, message: ack.statusRem || "Kotak severe error", raw });
    }
    return providerResponse.failed({
        providerReference,
        message: ack.statusRem || `Kotak rejected payment (${ack.statusCd})`,
        providerResponseCode: ack.statusCd,
        raw,
    });
};

const createPayout = async ({ providerReference, amount, beneficiaryName, accountNumber, ifscCode, ...rest }) => {
    // Build/validate/encrypt errors throw BEFORE anything is sent -> caller may safely treat as FAILED.
    const request = createKotakPaymentRequest({ providerReference, amount, beneficiaryName, accountNumber, ifscCode, ...rest });
    try {
        const res = await sendKotakPayment({ ...request, providerReference });
        return normalizePaymentResponse(res, { providerReference, messageId: request.messageId });
    } catch (error) {
        // Known, already-classified conditions propagate to kotakPayoutService.
        if (error.isDuplicate || error.isTimeout || error.stage === "oauth" || error instanceof KotakNotImplementedError || ["ETIMEDOUT", "ECONNABORTED", "ECONNRESET", "ENOTFOUND", "ECONNREFUSED"].includes(error.code)) throw error;
        // Anything else happened after the request may have reached Kotak
        // (e.g. unparsable response): outcome unknown, never FAILED.
        logger.error("kotak.createPayout.postSendError", { providerReference, messageId: request.messageId, error: error.message });
        return providerResponse.unknown({ providerReference, providerTransactionId: request.messageId, message: "Kotak response could not be processed; confirm via status inquiry" });
    }
};

// Status codes from spec 5.7.
const STATUS_MAP = {
    U: "SUCCESS",
    R: "FAILED", AR: "FAILED", DF: "FAILED", CR: "FAILED", CF: "FAILED", UP: "FAILED", DL: "FAILED", CN: "FAILED",
    C: "PROCESSING", PA: "PROCESSING", PS: "PROCESSING", IN: "PROCESSING", DC: "PROCESSING", "Error-99": "PROCESSING",
    // "Error-101" (Data Not Found) and "O" (Draft) are ambiguous -> UNKNOWN.
};

const checkStatus = async ({ providerReference, providerTransactionId }) => {
    // providerTransactionId may later hold a UTR, so always re-derive the MessageId.
    const messageId = providerReference ? toKotakId(providerReference) : providerTransactionId;
    const xml = buildKotakStatusXml({ messageId, instRefNo: messageId });
    const body = encryptKotakPaymentXml(xml);
    const res = await post({
        url: requireConfig().statusUrl,
        body,
        headers: { SOAPAction: SOAP_ACTION_REV, "Content-Type": "application/xml" },
        audit: {
            apiName: "Status / Reversal API",
            requestPayload: {
                encryptedPayload: "[MASKED]",
                payloadType: "Base64 encrypted XML",
                encryption: "AES-CBC",
                encoding: "Base64",
                encodedLength: body.length,
            },
            requestId: (xml.match(/<(?:\w+:)?Req_Id>([^<]+)<\/(?:\w+:)?Req_Id>/) || [])[1] || null,
            messageId,
            transactionId: providerTransactionId,
            providerReference,
        },
    });
    const raw = { httpStatus: res.status, xml: res.xml };
    if (res.status !== 200 || !res.xml) {
        // Inquiry itself failed: we learned nothing, so claim no provider record.
        return providerResponse.unknown({ providerReference, message: `Status inquiry HTTP ${res.status}${classifyFailure(res) ? ` (${classifyFailure(res)})` : ""}`, raw });
    }
    const code = tag(res.xml, "Status_Code");
    const desc = tag(res.xml, "Status_Desc");
    const utr = tag(res.xml, "UTR") || null;
    const status = STATUS_MAP[code] || "UNKNOWN";
    // Error-101 = Kotak has no record (spec 5.7): leave providerTransactionId empty so
    // performRetry may resubmit under the SAME MessageId (Kotak rejects duplicates: 002).
    const hasRecord = Boolean(code) && code !== "Error-101";
    const args = { providerReference, providerTransactionId: hasRecord ? (utr || messageId) : null, message: `${code || "?"}: ${desc || ""}`.trim(), raw };
    if (status === "SUCCESS") return providerResponse.success(args);
    if (status === "FAILED") return providerResponse.failed({ ...args, providerResponseCode: code });
    if (status === "PROCESSING") return providerResponse.processing(args);
    return providerResponse.unknown(args);
};

module.exports = {
    createPayout,
    checkStatus,
    KotakNotImplementedError,
    KotakHttpError,
    getKotakAccessToken,
    clearTokenCache,
    buildKotakPaymentXml,
    validateKotakPaymentXml,
    buildKotakStatusXml,
    encryptKotakPaymentXml,
    decryptKotakResponse,
    createKotakPaymentRequest,
    sendKotakPayment,
    normalizePaymentResponse,
    classifyFailure,
    kotakRequestId,
    toKotakId,
    SOAP_ACTION_PAY,
    SOAP_ACTION_REV,
};
