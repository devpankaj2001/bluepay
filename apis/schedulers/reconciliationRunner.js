/**
 * Reconciliation runner for payouts stuck in PROCESSING/UNKNOWN.
 *
 * A plain DB-poll interval (same shape as scheduledPayoutRunner.js /
 * webhookDispatcher.js) rather than a BullMQ consumer, on purpose: a payout
 * that timed out talking to the provider is exactly the kind of thing that
 * must NEVER depend on Redis being up to eventually get resolved. This is
 * also the safe-recovery mechanism required for the BullMQ payout queue
 * itself - if Redis is down (or a queued job is lost), a payout can still
 * only ever be sitting in 'processing'/'unknown' in Mongo, and this runner
 * will keep re-checking it with the provider until a final status is
 * confirmed, using the SAME idempotent provider reference every time.
 *
 * Never converts PROCESSING/UNKNOWN to FAILED on its own initiative - it
 * only applies whatever the provider actually reports (via
 * payoutEngine.applyProviderResult, the same finalizer every other payout
 * path uses), so funds stay safely locked for as long as the provider
 * itself has not given a final answer.
 *
 * Duplicate-reconciliation safety: a due payout is atomically claimed via
 * findOneAndUpdate (status + lastStatusCheckedAt guard flipping
 * reconciliationLockedAt from null/stale -> now), so two overlapping ticks
 * can never both re-check the same payout concurrently. applyProviderResult
 * itself is also safe to call repeatedly with a non-final result (PROCESSING
 * -> PROCESSING, UNKNOWN -> UNKNOWN) - it does not touch the wallet/ledger
 * again unless the provider result is SUCCESS or FAILED, so no double
 * finalization can occur even if this runner and a manual admin/merchant
 * status-check race on the same payout.
 */

const Payout = require("../models/Payout");
const kotakPayoutService = require("../services/bank/kotak/kotakPayoutService");
const kotakClient = require("../services/bank/kotak/kotakClient");
const { applyProviderResult } = require("../services/payoutEngine");
const logger = require("../utils/logger");

// payoutController.performRetry (when exported) implements the safe
// "check first, only resubmit with the same providerReference if the
// provider truly has no record at all" algorithm - reused here instead of
// re-deriving it, so there is exactly one place that decides when a
// resubmission (vs. a plain status re-check) is safe. Until it's exported,
// this runner falls back to pure status re-checks (still correct and safe,
// just cannot recover a payout that never reached the provider at all -
// that case still requires an admin/merchant-triggered retry in the
// meantime).
const payoutController = require("../controllers/payoutController");

const POLL_INTERVAL_MS = 20 * 1000; // 20 seconds
const BATCH_SIZE = 20;
const LOCK_STALE_MS = 2 * 60 * 1000; // reclaim a stuck lock after 2 minutes (crash mid-check)

// Back off how often the SAME payout is re-checked, so a long-stuck payout
// doesn't hammer the provider - grows with how many checks it has already had.
const recheckDelayMs = (payout) => {
    const checks = payout.retryCount || 0;
    const stepsMinutes = [0, 1, 2, 5, 10, 30, 60]; // minutes since lastStatusCheckedAt required before next check
    const minutes = stepsMinutes[Math.min(checks, stepsMinutes.length - 1)];
    return minutes * 60 * 1000;
};

const claimNextStuckPayout = async () => {
    const staleLockBefore = new Date(Date.now() - LOCK_STALE_MS);

    // Candidates: PROCESSING/UNKNOWN, has a provider reference to check
    // against, and is not currently locked by another in-flight check.
    const candidates = await Payout.find({
        status: { $in: ["processing", "unknown"] },
        providerReference: { $ne: null },
        $or: [{ reconciliationLockedAt: null }, { reconciliationLockedAt: { $lte: staleLockBefore } }],
    })
        .sort({ lastStatusCheckedAt: 1 })
        .limit(BATCH_SIZE)
        .lean();

    for (const candidate of candidates) {
        const dueAt = candidate.lastStatusCheckedAt
            ? new Date(candidate.lastStatusCheckedAt.getTime() + recheckDelayMs(candidate))
            : new Date(0);

        if (dueAt > new Date()) continue; // backoff window not elapsed yet for this one

        const claimed = await Payout.findOneAndUpdate(
            {
                _id: candidate._id,
                status: candidate.status,
                $or: [{ reconciliationLockedAt: null }, { reconciliationLockedAt: { $lte: staleLockBefore } }],
            },
            { $set: { reconciliationLockedAt: new Date() } },
            { new: true }
        );

        if (claimed) return claimed; // one at a time - release the lock before picking up the next
    }

    return null;
};

const reconcileOne = async (payout) => {
    try {
        let resultStatus;

        if (typeof payoutController.performRetry === "function") {
            // Safe check-then-resubmit-only-if-truly-unresponded path -
            // the only way a payout that never even reached the provider
            // can ever recover automatically.
            const outcome = await payoutController.performRetry(payout);
            resultStatus = outcome?.body?.payout?.status || payout.status;
        } else {
            // Fallback until performRetry is exported: pure status
            // re-check. Correct and safe, but cannot resubmit a payout
            // the provider has no record of at all.
            const providerResult = await kotakPayoutService.checkStatus({
                payoutId: payout._id.toString(),
                providerReference: payout.providerReference,
                providerTransactionId: payout.providerTransactionId,
            });

            payout.retryCount += 1;
            await applyProviderResult({ payout, providerResult });
            resultStatus = providerResult.status;
        }

        logger.info("reconciliation.checked", {
            payoutId: payout._id.toString(),
            providerReference: payout.providerReference,
            resultStatus,
        });

        const ageMs = Date.now() - new Date(payout.createdAt).getTime();
        if (ageMs > 24 * 60 * 60 * 1000 && (payout.status === "processing" || payout.status === "unknown")) {
            logger.warn("reconciliation.stuckOver24h", {
                payoutId: payout._id.toString(),
                status: payout.status,
                ageHours: Math.round(ageMs / 3600000),
            });
        }
    } catch (error) {
        if (error instanceof kotakClient.KotakNotImplementedError) {
            logger.error("reconciliation.providerNotConfigured", { payoutId: payout._id.toString() });
        } else {
            logger.error("reconciliation.checkFailed", { payoutId: payout._id.toString(), error: error.message });
        }
    } finally {
        // Release the lock unconditionally - if applyProviderResult moved
        // the payout to a final state this is a no-op for future sweeps
        // (the status filter above excludes success/failed anyway).
        await Payout.updateOne({ _id: payout._id }, { $set: { reconciliationLockedAt: null } });
    }
};

const tick = async () => {
    try {
        for (let i = 0; i < BATCH_SIZE; i += 1) {
            const payout = await claimNextStuckPayout();
            if (!payout) break;
            await reconcileOne(payout);
        }
    } catch (error) {
        logger.error("reconciliation.tickFailed", { error: error.message });
    }
};

let intervalHandle = null;

const start = () => {
    if (intervalHandle) return;
    intervalHandle = setInterval(tick, POLL_INTERVAL_MS);
    setTimeout(tick, 10000);
    logger.info("reconciliation.runnerStarted", { pollIntervalMs: POLL_INTERVAL_MS });
};

const stop = () => {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
};

module.exports = { start, stop, tick };
