/**
 * kotakPayoutService
 *
 * The ONLY module payoutController.js talks to for bank submission. It
 * hides which adapter (mock vs real Kotak) is in use behind
 * PAYOUT_PROVIDER_MODE, and normalizes every outcome - including network
 * errors - into the provider-independent shape from providerResponse.js.
 *
 * A network/timeout error is deliberately turned into UNKNOWN rather than
 * FAILED: BluePay cannot know whether Kotak received and is processing the
 * transfer, so it must not release the merchant's locked balance until a
 * status inquiry (or manual reconciliation) confirms one way or the other.
 */

const crypto = require("crypto");

const kotakConfig = require("./kotakConfig");
const kotakClient = require("./kotakClient");
const mockAdapter = require("./mockKotakAdapter");
const providerResponse = require("../providerResponse");
const logger = require("../../../utils/logger");

const PROVIDER_NAME = "KOTAK";

const getAdapter = () => (kotakConfig.isLiveMode() ? kotakClient : mockAdapter);

/**
 * Generates a unique BluePay-side reference for a payout. Must be called
 * exactly once per payout and persisted (Payout.providerReference) - every
 * retry MUST reuse the stored value instead of calling this again, or the
 * same payout could be submitted to Kotak twice under different references.
 */
const generateProviderReference = (payoutId) => {
    const random = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `BP-KOTAK-${payoutId}-${random}`;
};

const isTimeoutOrNetworkError = (error) =>
    Boolean(
        error &&
        (error.isTimeout ||
            ["ETIMEDOUT", "ECONNABORTED", "ECONNRESET", "ENOTFOUND", "ECONNREFUSED"].includes(error.code))
    );

/**
 * Submits a payout to Kotak (or the mock adapter).
 *
 * @param {object} params
 * @param {string} params.payoutId - internal Payout _id (string)
 * @param {string} params.providerReference - unique reference; reuse the
 *   same value on every retry for this payout (see generateProviderReference)
 * @param {number} params.amount
 * @param {string} params.beneficiaryName
 * @param {string} params.accountNumber
 * @param {string} params.ifscCode
 * @param {string} params.bankName
 * @returns {Promise<object>} normalized response (see providerResponse.js)
 */
const createPayout = async ({
    payoutId,
    providerReference,
    amount,
    beneficiaryName,
    accountNumber,
    ifscCode,
    bankName,
}) => {
    const adapter = getAdapter();
    const startedAt = Date.now();

    logger.info("kotak.createPayout.start", {
        payoutId,
        providerReference,
        provider: PROVIDER_NAME,
        mode: kotakConfig.getMode(),
    });

    try {
        const result = await adapter.createPayout({
            providerReference,
            amount,
            beneficiaryName,
            accountNumber,
            ifscCode,
            bankName,
        });

        logger.info("kotak.createPayout.result", {
            payoutId,
            providerReference,
            providerTransactionId: result.providerTransactionId,
            status: result.status,
            durationMs: Date.now() - startedAt,
        });

        return result;
    } catch (error) {
        const durationMs = Date.now() - startedAt;

        if (error instanceof kotakClient.KotakNotImplementedError) {
            logger.error("kotak.createPayout.notImplemented", {
                payoutId,
                providerReference,
                durationMs,
            });
            throw error;
        }

        if (isTimeoutOrNetworkError(error)) {
            logger.warn("kotak.createPayout.timeout", {
                payoutId,
                providerReference,
                durationMs,
                errorCode: error.code,
            });

            // Unknown, NOT failed - we don't know if Kotak received it.
            return providerResponse.unknown({
                providerReference,
                message: "Kotak request timed out; status must be confirmed via status inquiry before releasing funds",
            });
        }

        if (error && error.isDuplicate) {
            // Provider says this reference was already submitted - that
            // means the ORIGINAL attempt may have gone through. Treat as
            // processing/unresolved rather than silently retrying with a
            // new reference (which would risk a duplicate transfer).
            logger.warn("kotak.createPayout.duplicateReference", {
                payoutId,
                providerReference,
                durationMs,
            });

            return providerResponse.processing({
                providerReference,
                message: "Provider reports this reference was already submitted; confirm via status inquiry",
            });
        }

        logger.error("kotak.createPayout.error", {
            payoutId,
            providerReference,
            durationMs,
            error: error.message,
        });

        return providerResponse.failed({
            providerReference,
            message: error.message || "Kotak payout request failed",
        });
    }
};

/**
 * Status inquiry for a payout already submitted to Kotak. Used by admin/
 * internal reconciliation, never exposed as an unrestricted public API.
 */
const checkStatus = async ({ payoutId, providerReference, providerTransactionId }) => {
    const adapter = getAdapter();
    const startedAt = Date.now();

    logger.info("kotak.checkStatus.start", {
        payoutId,
        providerReference,
        providerTransactionId,
        mode: kotakConfig.getMode(),
    });

    try {
        const result = await adapter.checkStatus({ providerReference, providerTransactionId });

        logger.info("kotak.checkStatus.result", {
            payoutId,
            providerReference,
            status: result.status,
            durationMs: Date.now() - startedAt,
        });

        return result;
    } catch (error) {
        const durationMs = Date.now() - startedAt;

        if (error instanceof kotakClient.KotakNotImplementedError) {
            logger.error("kotak.checkStatus.notImplemented", { payoutId, providerReference, durationMs });
            throw error;
        }

        logger.warn("kotak.checkStatus.error", {
            payoutId,
            providerReference,
            durationMs,
            error: error.message,
        });

        return providerResponse.unknown({
            providerReference,
            providerTransactionId,
            message: "Status inquiry failed; try again or escalate to manual reconciliation",
        });
    }
};

module.exports = {
    PROVIDER_NAME,
    generateProviderReference,
    createPayout,
    checkStatus,
};
