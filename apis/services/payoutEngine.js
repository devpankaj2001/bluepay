/**
 * Shared payout engine.
 *
 * This is the SINGLE place that moves money for a payout - the original
 * createPayout HTTP handler, bulk payout rows, and scheduled payout
 * executions all funnel through `submitPayout` / `applyProviderResult` here
 * instead of re-implementing wallet reservation, provider submission, or
 * ledger finalization.
 */
const mongoose = require("mongoose");

const { createWebhookEvent } = require("./webhookService");

const Payout = require("../models/Payout");
const Wallet = require("../models/Wallet");

const { reserveForPayout, completePayout, failPayout } = require("../utils/ledger");
const idempotencyCore = require("../utils/idempotencyCore");

const kotakPayoutService = require("./bank/kotak/kotakPayoutService");
const kotakClient = require("./bank/kotak/kotakClient");
const logger = require("../utils/logger");

class PayoutValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "PayoutValidationError";
        this.code = "VALIDATION_ERROR";
    }
}

class InsufficientBalanceError extends Error {
    constructor(message) {
        super(message || "Insufficient wallet balance");
        this.name = "InsufficientBalanceError";
        this.code = "INSUFFICIENT_BALANCE";
    }
}

/**
 * Applies a normalized provider response (see services/bank/providerResponse.js)
 * to an already-reserved payout: finalizes wallet/ledger on SUCCESS/FAILED,
 * or just records the provider's answer while keeping funds locked for
 * PROCESSING/UNKNOWN. Runs in its own DB transaction so the payout record,
 * wallet, and ledger entry move together.
 *
 * Never called with a payout that hasn't already had funds reserved.
 */
const applyProviderResult = async ({ payout, providerResult }) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            // Guard against concurrent resolvers (reconciliation / retry / worker) acting on a
            // stale copy: a payout already SUCCESS must never be re-finalized or flipped to FAILED,
            // and an already-FAILED payout must not release funds twice.
            const current = await Payout.findById(payout._id).session(session).select("status").lean();
            if (current && (current.status === "success" || (current.status === "failed" && providerResult.status === "FAILED"))) {
                payout.status = current.status;
                return;
            }

            payout.providerTransactionId =
                providerResult.providerTransactionId || payout.providerTransactionId;
            payout.providerStatus = providerResult.status;
            payout.providerMessage = providerResult.message || "";
            payout.providerResponseCode =
                providerResult.providerResponseCode || payout.providerResponseCode;
            payout.lastStatusCheckedAt = new Date();

            if (providerResult.status === "SUCCESS") {
                await completePayout({
                    userId: payout.userId,
                    amount: payout.amount,
                    payoutId: payout._id.toString(),
                    session,
                });

                payout.status = "success";
                payout.completedAt = new Date();

                if (providerResult.providerTransactionId) {
                    payout.txn_id = providerResult.providerTransactionId;
                }
            } else if (providerResult.status === "FAILED") {
                await failPayout({
                    userId: payout.userId,
                    amount: payout.amount,
                    payoutId: payout._id.toString(),
                    reason: providerResult.message,
                    session,
                });

                payout.status = "failed";
                payout.failedAt = new Date();
                payout.remarks = providerResult.message || "Payout failed";
            } else {
                // PROCESSING or UNKNOWN - funds stay locked, nothing to
                // release yet. A later status inquiry / reconciliation
                // call will resolve this via applyProviderResult again.
                payout.status = providerResult.status === "UNKNOWN" ? "unknown" : "processing";
            }

            await payout.save({ session });
        });
    } finally {
        await session.endSession();
    }

    const webhookEventByStatus = {
        success: "payout.success",
        failed: "payout.failed",
        processing: "payout.processing",
        unknown: "payout.unknown",
    };

    const webhookEvent = webhookEventByStatus[payout.status];

    if (webhookEvent) {
        try {
            await createWebhookEvent({
                userId: payout.userId,
                event: webhookEvent,
                payout,
            });
        } catch (webhookError) {
            logger.error("payout.webhook.enqueueFailed", {
                payoutId: payout._id.toString(),
                event: webhookEvent,
                error: webhookError.message,
            });
        }
    }

    return payout;
};

const validatePayoutInput = ({ amount, beneficiary_name, account_number, ifsc_code }) => {
    const payoutAmount = Number(amount);

    if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
        throw new PayoutValidationError("Invalid payout amount");
    }

    if (!beneficiary_name || !String(beneficiary_name).trim()) {
        throw new PayoutValidationError("Beneficiary name is required");
    }

    if (!account_number || !String(account_number).trim()) {
        throw new PayoutValidationError("Account number is required");
    }

    if (!ifsc_code || !String(ifsc_code).trim()) {
        throw new PayoutValidationError("IFSC code is required");
    }

    return payoutAmount;
};

const reservePayoutForProcessing = async ({
    userId,
    amount,
    beneficiary_name,
    account_number,
    ifsc_code,
    bank_name,
    extra = {},
    session,
}) => {
    if (!session) {
        throw new Error("A database session is required to reserve a payout");
    }

    const payoutAmount = validatePayoutInput({ amount, beneficiary_name, account_number, ifsc_code });
    const [payout] = await Payout.create(
        [{
            userId,
            amount: payoutAmount,
            beneficiary_name,
            account_number,
            ifsc_code,
            bank_name,
            status: "processing",
            ...extra,
        }],
        { session }
    );

    const reserveResult = await reserveForPayout({
        userId,
        amount: payoutAmount,
        payoutId: payout._id.toString(),
        createdBy: userId,
        metadata: {
            beneficiary_name,
            account_number_last4: String(account_number).slice(-4),
            ifsc_code,
        },
        session,
    });

    payout.provider = kotakPayoutService.PROVIDER_NAME;
    payout.providerReference = kotakPayoutService.generateProviderReference(payout._id.toString());
    payout.submittedAt = new Date();
    await payout.save({ session });

    return { payout, wallet: reserveResult.wallet, ledger: reserveResult.ledger };
};

/**
 * Full payout lifecycle: (optional idempotency claim) -> create payout +
 * reserve wallet + ledger DEBIT/PROCESSING (one transaction) -> submit to
 * Kotak (outside the transaction) -> record provider result & finalize
 * wallet/ledger (one transaction).
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {number|string} params.amount
 * @param {string} params.beneficiary_name
 * @param {string} params.account_number
 * @param {string} params.ifsc_code
 * @param {string} [params.bank_name]
 * @param {object} [params.extra] - extra fields stored on the Payout doc (batchId, scheduledPayoutId, ...)
 * @param {{ key: string, requestType: string, payload?: object }} [params.idempotency]
 *        When provided, submitPayout performs its OWN idempotency claim
 *        (for internal callers - bulk rows, scheduled runs - that don't go
 *        through the Express idempotency middleware). Omit this when the
 *        caller (e.g. the createPayout HTTP route) already claimed a key
 *        via the middleware, to avoid claiming twice.
 */
const submitPayout = async ({
    userId,
    amount,
    beneficiary_name,
    account_number,
    ifsc_code,
    bank_name,
    extra = {},
    idempotency = null,
}) => {
    let idempotencyRecord = null;

    if (idempotency) {
        const claimResult = await idempotencyCore.claim({
            userId,
            key: idempotency.key,
            requestType: idempotency.requestType,
            payload: idempotency.payload || { amount, beneficiary_name, account_number, ifsc_code },
        });

        if (!claimResult.claimed) {
            return {
                shortCircuit: true,
                statusCode: claimResult.statusCode,
                body: claimResult.body,
            };
        }

        idempotencyRecord = claimResult.record;
    }

    try {
        const payoutAmount = validatePayoutInput({ amount, beneficiary_name, account_number, ifsc_code });

        // ---------- PHASE 1: create payout + reserve wallet + ledger (one transaction) ----------
        let payout;
        let wallet;
        let ledger;

        const reserveSession = await mongoose.startSession();

        try {
            await reserveSession.withTransaction(async () => {
                const created = await Payout.create(
                    [
                        {
                            userId,
                            amount: payoutAmount,
                            beneficiary_name,
                            account_number,
                            ifsc_code,
                            bank_name,
                            status: "processing",
                            ...extra,
                        },
                    ],
                    { session: reserveSession }
                );

                payout = created[0];

                const reserveResult = await reserveForPayout({
                    userId,
                    amount: payoutAmount,
                    payoutId: payout._id.toString(),
                    createdBy: userId,
                    metadata: {
                        beneficiary_name,
                        account_number_last4: String(account_number).slice(-4),
                        ifsc_code,
                    },
                    session: reserveSession,
                });

                wallet = reserveResult.wallet;
                ledger = reserveResult.ledger;
            });
        } catch (walletError) {
            throw new InsufficientBalanceError(walletError.message);
        } finally {
            await reserveSession.endSession();
        }

        // ---------- Submit to Kotak (outside any DB transaction) ----------
        const providerReference = kotakPayoutService.generateProviderReference(payout._id.toString());

        payout.provider = kotakPayoutService.PROVIDER_NAME;
        payout.providerReference = providerReference;
        payout.submittedAt = new Date();
        await payout.save();

        let providerResult;

        try {
            providerResult = await kotakPayoutService.createPayout({
                payoutId: payout._id.toString(),
                providerReference,
                amount: payoutAmount,
                beneficiaryName: beneficiary_name,
                accountNumber: account_number,
                ifscCode: ifsc_code,
                bankName: bank_name,
            });
        } catch (providerError) {
            if (providerError instanceof kotakClient.KotakNotImplementedError) {
                logger.error("payout.provider.notConfigured", {
                    payoutId: payout._id.toString(),
                    providerReference,
                });
            } else {
                logger.error("payout.provider.unexpectedError", {
                    payoutId: payout._id.toString(),
                    providerReference,
                    error: providerError.message,
                });
            }

            // Funds are already locked and we genuinely don't know the
            // outcome - never guess FAILED here. Leave it for reconciliation.
            providerResult = {
                success: false,
                status: "UNKNOWN",
                providerTransactionId: null,
                providerReference,
                message: "Payout could not be confirmed with the provider; pending reconciliation",
            };
        }

        // ---------- PHASE 2: record provider result, finalize wallet/ledger (one transaction) ----------
        payout = await applyProviderResult({ payout, providerResult });

        const finalWallet = await Wallet.findOne({ userId }).lean();

        const responseBody = {
            success: payout.status !== "failed",
            msg: providerResult.message || "Payout created",
            payout,
            wallet: finalWallet || wallet,
            ledger,
        };

        if (idempotencyRecord) {
            await idempotencyCore.finalize(idempotencyRecord, {
                status: "SUCCESS",
                statusCode: 201,
                body: responseBody,
                resourceId: payout._id.toString(),
            });
        }

        return {
            shortCircuit: false,
            statusCode: 201,
            body: responseBody,
            payout,
            wallet: finalWallet || wallet,
            ledger,
            providerResult,
        };
    } catch (error) {
        if (idempotencyRecord) {
            await idempotencyCore.finalize(idempotencyRecord, {
                status: "FAILED",
                statusCode: error.code === "VALIDATION_ERROR" || error.code === "INSUFFICIENT_BALANCE" ? 400 : 500,
                body: { msg: error.message },
            });
        }

        throw error;
    }
};

module.exports = {
    applyProviderResult,
    submitPayout,
    reservePayoutForProcessing,
    validatePayoutInput,
    PayoutValidationError,
    InsufficientBalanceError,
};
