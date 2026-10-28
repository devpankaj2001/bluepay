/**
 * Provider-independent response shape.
 *
 * Every bank/provider adapter (Kotak today, others later) must return
 * responses normalized through these builders so the rest of BluePay
 * (controllers, ledger, webhooks to merchants) never has to know which
 * bank actually handled the transfer.
 */

const PAYOUT_STATUS = Object.freeze({
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    UNKNOWN: "UNKNOWN",
});

const success = ({ providerTransactionId, providerReference, message = "Payout successful", raw = null }) => ({
    success: true,
    status: PAYOUT_STATUS.SUCCESS,
    providerTransactionId: providerTransactionId || null,
    providerReference: providerReference || null,
    message,
    raw,
});

const processing = ({ providerTransactionId, providerReference, message = "Payout is being processed by the provider", raw = null }) => ({
    success: false,
    status: PAYOUT_STATUS.PROCESSING,
    providerTransactionId: providerTransactionId || null,
    providerReference: providerReference || null,
    message,
    raw,
});

const failed = ({ providerTransactionId, providerReference, message = "Payout failed", providerResponseCode = null, raw = null }) => ({
    success: false,
    status: PAYOUT_STATUS.FAILED,
    providerTransactionId: providerTransactionId || null,
    providerReference: providerReference || null,
    message,
    providerResponseCode,
    raw,
});

const unknown = ({ providerTransactionId = null, providerReference = null, message = "Provider status could not be confirmed", raw = null }) => ({
    success: false,
    status: PAYOUT_STATUS.UNKNOWN,
    providerTransactionId,
    providerReference,
    message,
    raw,
});

module.exports = {
    PAYOUT_STATUS,
    success,
    processing,
    failed,
    unknown,
};
