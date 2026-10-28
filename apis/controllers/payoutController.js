const Payout = require("../models/Payout");
const FundRequest = require("../models/FundRequest");
const Wallet = require("../models/Wallet");

const payoutEngine = require("../services/payoutEngine");
const kotakPayoutService = require("../services/bank/kotak/kotakPayoutService");
const kotakClient = require("../services/bank/kotak/kotakClient");
const logger = require("../utils/logger");
const { maskPayout } = require("../utils/mask");
const { logActivity } = require("../utils/activityLogger");

const { applyProviderResult } = payoutEngine;

// Exported so the payout worker (workers/payoutWorker.js) can finalize a
// job's provider result the exact same way the synchronous createPayout
// flow does, instead of re-implementing wallet/ledger finalization.
exports.applyProviderResult = applyProviderResult;

const VALID_STATUSES = ["pending", "processing", "success", "failed", "unknown"];

/**
 * CREATE PAYOUT
 *
 * Thin HTTP wrapper around payoutEngine.submitPayout - the exact same
 * engine used by bulk payouts and scheduled payouts. The Express
 * idempotency middleware (middleware/idempotencyMiddleware.js) has already
 * claimed the Idempotency-Key before this handler runs, so submitPayout is
 * called WITHOUT its own `idempotency` option here (that option is only for
 * internal callers that don't go through the middleware).
 */
exports.createPayout = async (req, res) => {
    const { idempotency } = req;

    try {
        const userId = req.user.id || req.user._id;

        const { amount, beneficiary_name, account_number, ifsc_code, bank_name } = req.body;

        const result = await payoutEngine.submitPayout({
            userId,
            amount,
            beneficiary_name,
            account_number,
            ifsc_code,
            bank_name,
            extra: { environment: req.apiCredential?.environment || 'live' },
        });

        logActivity({
            userId,
            type: "USER_ACTIVITY",
            action: "PAYOUT_CREATED",
            description: `Payout created for ₹${result.payout.amount}`,
            resourceType: "PAYOUT",
            resourceId: result.payout._id,
            req,
            metadata: { status: result.payout.status },
        });

        return idempotency.complete(res, result.statusCode, result.body, result.payout._id.toString());
    } catch (error) {
        console.error("createPayout:", error.message);

        if (error.code === "VALIDATION_ERROR" || error.code === "INSUFFICIENT_BALANCE") {
            return idempotency.fail(res, 400, { msg: error.message });
        }

        if (idempotency) {
            return idempotency.fail(res, 500, {
                msg: "Failed to create payout",
            });
        }

        return res.status(500).json({
            msg: "Failed to create payout",
            requestId: req.requestId,
        });
    }
};


/**
 * MARK PAYOUT SUCCESS (manual admin override)
 */
exports.markPayoutSuccess = async (req, res) => {
    try {
        const payoutId = req.params.id || req.params.payoutId;
        const payout = await Payout.findById(payoutId);

        if (!payout) {
            return res.status(404).json({ msg: "Payout not found" });
        }

        if (payout.status === "success") {
            return res.json({ success: true, msg: "Payout already successful", payout });
        }

        if (payout.status === "failed") {
            return res.status(400).json({ msg: "Failed payout cannot be marked successful" });
        }

        const updated = await applyProviderResult({
            payout,
            providerResult: {
                status: "SUCCESS",
                providerTransactionId: req.body.txn_id || payout.providerTransactionId,
                message: req.body.remarks || "Manually confirmed successful by admin",
            },
        });

        logger.info("payout.manualOverride.success", {
            payoutId: updated._id.toString(),
            adminId: req.user.id || req.user._id,
        });

        return res.json({ success: true, msg: "Payout marked successful", payout: updated });

    } catch (error) {
        console.error("markPayoutSuccess:", error);
        return res.status(500).json({ msg: "Failed to complete payout", requestId: req.requestId });
    }
};


/**
 * MARK PAYOUT FAILED (manual admin override)
 */
exports.markPayoutFailed = async (req, res) => {
    try {
        const payoutId = req.params.id || req.params.payoutId;
        const payout = await Payout.findById(payoutId);

        if (!payout) {
            return res.status(404).json({ msg: "Payout not found" });
        }

        if (payout.status === "failed") {
            return res.json({ success: true, msg: "Payout already failed", payout });
        }

        if (payout.status === "success") {
            return res.status(400).json({ msg: "Successful payout cannot be marked failed" });
        }

        const reason = req.body.reason || "Payout failed (manual admin override)";

        const updated = await applyProviderResult({
            payout,
            providerResult: { status: "FAILED", message: reason },
        });

        logger.info("payout.manualOverride.failed", {
            payoutId: updated._id.toString(),
            adminId: req.user.id || req.user._id,
        });

        return res.json({ success: true, msg: "Payout failed and balance released", payout: updated });

    } catch (error) {
        console.error("markPayoutFailed:", error);
        return res.status(500).json({ msg: "Failed to process payout failure", requestId: req.requestId });
    }
};


/**
 * ADMIN: manual status override dispatcher
 * PUT /:id/status  { status: 'success' | 'failed', reason?, txn_id? }
 */
exports.updatePayoutStatus = async (req, res) => {
    const { status } = req.body;

    if (status === "success") {
        return exports.markPayoutSuccess(req, res);
    }

    if (status === "failed") {
        return exports.markPayoutFailed(req, res);
    }

    return res.status(400).json({ msg: "Invalid status. Must be 'success' or 'failed'" });
};


/**
 * Shared core for status inquiry, used by both the admin route and the
 * merchant (ownership-checked) route below. Safe to call repeatedly -
 * does not move money by itself; only applyProviderResult, driven by
 * whatever the provider currently reports, finalizes wallet/ledger.
 */
const performStatusCheck = async (payout) => {
    if (payout.status === "success" || payout.status === "failed") {
        return {
            statusCode: 200,
            body: {
                success: true,
                msg: `Payout already in a final state (${payout.status}); no inquiry needed`,
                payout,
            },
        };
    }

    if (!payout.providerReference) {
        return { statusCode: 400, body: { msg: "Payout was never submitted to a provider" } };
    }

    const providerResult = await kotakPayoutService.checkStatus({
        payoutId: payout._id.toString(),
        providerReference: payout.providerReference,
        providerTransactionId: payout.providerTransactionId,
    });

    const updated = await applyProviderResult({ payout, providerResult });

    return {
        statusCode: 200,
        body: { success: true, msg: "Status inquiry complete", payout: updated, providerResult },
    };
};

/**
 * Shared core for the safe retry flow. Never submits a second transfer
 * under a new reference:
 *   1. Runs a status inquiry with the EXISTING providerReference first, in
 *      case the original attempt already resolved.
 *   2. Only if the provider still has no record of that reference at all
 *      does it resubmit - reusing the SAME providerReference.
 * This is exactly what makes it safe to expose to merchants for their own
 * FAILED/UNKNOWN/PROCESSING payouts too - an UNKNOWN/timeout payout is
 * never blindly resubmitted.
 */
const performRetry = async (payout) => {
    if (payout.status === "success" || payout.status === "failed") {
        return { statusCode: 400, body: { msg: `Payout is already ${payout.status}; nothing to retry` } };
    }

    if (!payout.providerReference) {
        return { statusCode: 400, body: { msg: "Payout has no provider reference yet; cannot retry" } };
    }

    const statusResult = await kotakPayoutService.checkStatus({
        payoutId: payout._id.toString(),
        providerReference: payout.providerReference,
        providerTransactionId: payout.providerTransactionId,
    });

    if (statusResult.status !== "UNKNOWN" || statusResult.providerTransactionId) {
        // Provider has a record either way (resolved, or still genuinely
        // processing) - apply it, do not resubmit.
        const updated = await applyProviderResult({ payout, providerResult: statusResult });

        payout.retryCount += 1;
        await payout.save();

        return {
            statusCode: 200,
            body: {
                success: true,
                msg: "Provider already has a record of this payout; resubmission skipped",
                payout: updated,
            },
        };
    }

    // Provider genuinely has no record - safe to resubmit, reusing the same reference.
    const providerResult = await kotakPayoutService.createPayout({
        payoutId: payout._id.toString(),
        providerReference: payout.providerReference,
        amount: payout.amount,
        beneficiaryName: payout.beneficiary_name,
        accountNumber: payout.account_number,
        ifscCode: payout.ifsc_code,
        bankName: payout.bank_name,
    });

    payout.retryCount += 1;
    const updated = await applyProviderResult({ payout, providerResult });

    logger.info("payout.retry", {
        payoutId: updated._id.toString(),
        providerReference: payout.providerReference,
        retryCount: payout.retryCount,
        resultStatus: providerResult.status,
    });

    return { statusCode: 200, body: { success: true, msg: "Retry submitted", payout: updated } };
};

/**
 * ADMIN / INTERNAL: status inquiry against the provider for reconciliation.
 */
exports.checkPayoutStatus = async (req, res) => {
    try {
        const payoutId = req.params.id || req.params.payoutId;
        const payout = await Payout.findById(payoutId);

        if (!payout) {
            return res.status(404).json({ msg: "Payout not found" });
        }

        const result = await performStatusCheck(payout);
        return res.status(result.statusCode).json(result.body);

    } catch (error) {
        if (error instanceof kotakClient.KotakNotImplementedError) {
            return res.status(503).json({
                msg: "Live Kotak status inquiry is not implemented; official Kotak API documentation is required",
            });
        }
        console.error("checkPayoutStatus:", error);
        return res.status(500).json({ msg: "Failed to check payout status", requestId: req.requestId });
    }
};


/**
 * ADMIN / INTERNAL: safe retry for a payout stuck in PROCESSING/UNKNOWN.
 */
exports.retryPayout = async (req, res) => {
    try {
        const payoutId = req.params.id || req.params.payoutId;
        const payout = await Payout.findById(payoutId);

        if (!payout) {
            return res.status(404).json({ msg: "Payout not found" });
        }

        const result = await performRetry(payout);
        return res.status(result.statusCode).json(result.body);

    } catch (error) {
        if (error instanceof kotakClient.KotakNotImplementedError) {
            return res.status(503).json({
                msg: "Live Kotak retry is not implemented; official Kotak API documentation is required",
            });
        }
        console.error("retryPayout:", error);
        return res.status(500).json({ msg: "Failed to retry payout", requestId: req.requestId });
    }
};


/**
 * MERCHANT: status inquiry on OWN payout only. Same safe core as admin.
 */
exports.merchantCheckStatus = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const payoutId = req.params.id;

        const payout = await Payout.findOne({ _id: payoutId, userId });

        if (!payout) {
            return res.status(404).json({ msg: "Payout not found" });
        }

        const result = await performStatusCheck(payout);
        result.body.payout = maskPayout(result.body.payout);
        return res.status(result.statusCode).json(result.body);

    } catch (error) {
        if (error instanceof kotakClient.KotakNotImplementedError) {
            return res.status(503).json({
                msg: "Live Kotak status inquiry is not implemented; official Kotak API documentation is required",
            });
        }
        console.error("merchantCheckStatus:", error);
        return res.status(500).json({ msg: "Failed to check payout status", requestId: req.requestId });
    }
};


/**
 * MERCHANT: safe retry on OWN payout only. Same safe core as admin - never
 * blindly resubmits an UNKNOWN/timeout payout.
 */
exports.merchantRetryPayout = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const payoutId = req.params.id;

        const payout = await Payout.findOne({ _id: payoutId, userId });

        if (!payout) {
            return res.status(404).json({ msg: "Payout not found" });
        }

        const result = await performRetry(payout);
        result.body.payout = maskPayout(result.body.payout);
        return res.status(result.statusCode).json(result.body);

    } catch (error) {
        if (error instanceof kotakClient.KotakNotImplementedError) {
            return res.status(503).json({
                msg: "Live Kotak retry is not implemented; official Kotak API documentation is required",
            });
        }
        console.error("merchantRetryPayout:", error);
        return res.status(500).json({ msg: "Failed to retry payout", requestId: req.requestId });
    }
};


/**
 * MERCHANT: list own payouts with search/filter/pagination.
 *
 * Query params:
 *   page, limit
 *   status         - 'all' | pending | processing | success | failed | unknown
 *   search         - matches payout id, txn_id, providerTransactionId, providerReference, beneficiary_name
 *   beneficiary    - exact-ish match on beneficiary_name
 *   dateFrom, dateTo   - ISO date strings, inclusive
 *   amountMin, amountMax
 */
exports.getUserPayouts = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const {
            page = 1,
            limit = 20,
            status,
            search,
            beneficiary,
            dateFrom,
            dateTo,
            amountMin,
            amountMax,
        } = req.query;

        const query = { userId };

        if (status && status !== "all") {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({ msg: "Invalid status filter" });
            }
            query.status = status;
        }

        if (beneficiary) {
            query.beneficiary_name = { $regex: beneficiary, $options: "i" };
        }

        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        if (amountMin || amountMax) {
            query.amount = {};
            if (amountMin) query.amount.$gte = Number(amountMin);
            if (amountMax) query.amount.$lte = Number(amountMax);
        }

        if (search && search.trim()) {
            const s = search.trim();
            const regex = { $regex: s, $options: "i" };
            const orClauses = [
                { beneficiary_name: regex },
                { txn_id: regex },
                { providerTransactionId: regex },
                { providerReference: regex },
            ];
            if (/^[a-f0-9]{24}$/i.test(s)) {
                orClauses.push({ _id: s });
            }
            query.$and = (query.$and || []).concat([{ $or: orClauses }]);
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

        const [payouts, total] = await Promise.all([
            Payout.find(query)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Payout.countDocuments(query),
        ]);

        return res.json({
            success: true,
            payouts: payouts.map(maskPayout),
            total,
            page: pageNum,
            pages: Math.max(1, Math.ceil(total / limitNum)),
            limit: limitNum,
        });
    } catch (error) {
        console.error("getUserPayouts failed");
        return res.status(500).json({ msg: "Failed to load payouts", requestId: req.requestId });
    }
};


/**
 * MERCHANT: single payout detail (own payout only).
 */
exports.getUserPayoutById = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const payout = await Payout.findOne({ _id: req.params.id, userId }).lean();

        if (!payout) {
            return res.status(404).json({ msg: "Payout not found" });
        }

        return res.json({ success: true, payout: maskPayout(payout) });
    } catch (error) {
        console.error("getUserPayoutById:", error);
        return res.status(500).json({ msg: "Failed to load payout", requestId: req.requestId });
    }
};


/**
 * ADMIN: list all payouts (reconciliation view)
 */
exports.getAllPayouts = async (req, res) => {
    try {
        const payouts = await Payout.find({})
            .sort({ createdAt: -1 })
            .limit(500)
            .populate("userId", "first_name last_name email")
            .lean();

        return res.json(payouts);
    } catch (error) {
        console.error("getAllPayouts:", error);
        return res.status(500).json({ msg: "Failed to load payouts", requestId: req.requestId });
    }
};


/**
 * ADMIN: payouts + fund requests + basic metrics for a single merchant.
 * Used by the admin "User Details" page.
 */
exports.getUserDetailsForAdmin = async (req, res) => {
    try {
        const userId = req.params.id;

        const [payouts, fundRequests, failedTotals, fundTotals] = await Promise.all([
            Payout.find({ userId: require('mongoose').Types.ObjectId.createFromHexString(userId) }).sort({ createdAt: -1 }).limit(200).lean(),
            FundRequest.find({ userId }).sort({ createdAt: -1 }).limit(200).lean(),
            Payout.aggregate([{ $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId), status: 'failed' } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
            FundRequest.aggregate([{ $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId), status: 'approved' } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
        ]);

        const metrics = payouts.reduce(
            (acc, p) => {
                acc.totalPayouts += 1;
                if (p.status === "success") {
                    acc.successCount += 1;
                    acc.totalPaidOut += p.amount;
                } else if (p.status === "failed") {
                    acc.failedCount += 1;
                } else {
                    acc.pendingCount += 1;
                }
                return acc;
            },
            { totalPayouts: 0, successCount: 0, failedCount: 0, pendingCount: 0, totalPaidOut: 0 }
        );
        metrics.totalFailedAmount = failedTotals[0]?.amount || 0;
        metrics.totalFundAdded = fundTotals[0]?.amount || 0;

        return res.json({ success: true, payouts: payouts.map(maskPayout), fundRequests, metrics });
    } catch (error) {
        console.error("getUserDetailsForAdmin:", error);
        return res.status(500).json({ msg: "Failed to load user payout details", requestId: req.requestId });
    }
};
