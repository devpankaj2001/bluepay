const crypto = require("crypto");

/**
 * CCAvenue "Non-Seamless" (redirect) integration helpers.
 *
 * This implements CCAvenue's published request/response encryption
 * scheme (AES-128-CBC, key = MD5(workingKey), fixed 16-byte IV). These
 * constants are documented in CCAvenue's own integration kit — they are
 * not secret. The actual secret is the Working Key itself, which is
 * read from process.env and never hardcoded or logged.
 */

const FIXED_IV = Buffer.from([
    0x00, 0x01, 0x02, 0x03,
    0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b,
    0x0c, 0x0d, 0x0e, 0x0f,
]);

const deriveKey = (workingKey) =>
    crypto.createHash("md5").update(String(workingKey)).digest();

/**
 * Encrypts a `key=value&key=value` request string for CCAvenue.
 */
const encrypt = (plainText, workingKey) => {
    const key = deriveKey(workingKey);
    const cipher = crypto.createCipheriv("aes-128-cbc", key, FIXED_IV);

    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted;
};

/**
 * Decrypts CCAvenue's `encResp` back into a `key=value&key=value` string.
 */
const decrypt = (encText, workingKey) => {
    const key = deriveKey(workingKey);
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, FIXED_IV);

    let decrypted = decipher.update(encText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
};

/**
 * Builds the plain (unencrypted) request body CCAvenue expects, from a
 * plain object. Field order does not matter to CCAvenue.
 */
const buildRequestString = (fields) => {
    return Object.entries(fields)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([keyName, value]) => `${keyName}=${value}`)
        .join("&");
};

/**
 * Parses CCAvenue's decrypted `key=value&key=value` response body into
 * a plain object.
 */
const parseResponseString = (responseString) => {
    const result = {};

    String(responseString || "")
        .split("&")
        .forEach((pair) => {
            if (!pair) return;

            const separatorIndex = pair.indexOf("=");

            if (separatorIndex === -1) {
                result[pair] = "";
                return;
            }

            const rawKey = pair.slice(0, separatorIndex);
            const rawValue = pair.slice(separatorIndex + 1);

            result[rawKey] = rawValue;
        });

    return result;
};

module.exports = {
    encrypt,
    decrypt,
    buildRequestString,
    parseResponseString,
};
