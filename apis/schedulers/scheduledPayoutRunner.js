/**
 * Scheduled payout runner.
 *
 * Polls for due ScheduledPayout documents and executes each one through
 * payoutEngine.submitPayout - the exact same engine createPayout and bulk
 * payouts use - so wallet reservation, ledger entries, provider submission
 * and idempotency all behave identically to a manually-created payout.
 *
 * Duplicate-execution safety:
 *   1. A due schedule is atomically claimed via findOneAndUpdate flipping
 *      status 'active' -> 'running' with the same nextRunAt guard in the
 *      filter, so two overlapping ticks (or two app instances) can never
 *      both claim the same occurrence.
 *   2. Independently, the payout itself is submitted with an idempotency
 *      key derived from (scheduleId, the exact nextRunAt being executed),
 *      so even a crash-and-retry of the same occurrence can never create a
 *      second payout for it.
 */

const ScheduledPayout = require('../models/ScheduledPayout');
const payoutEngine = require('../services/payoutEngine');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = 60 * 1000; // 1 minute

const computeNextRun = (frequency, from) => {
    const next = new Date(from);
    if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly') {
        next.setDate(next.getDate() + 7);
    } else if (frequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
    }
    return next;
};

const executeSchedule = async (scheduleId, occurrenceAt) => {
    // Atomic claim - only one process/tick can move a given occurrence
    // from 'active' to 'running'.
    const claimed = await ScheduledPayout.findOneAndUpdate(
        { _id: scheduleId, status: 'active', nextRunAt: occurrenceAt },
        { $set: { status: 'running' } },
        { new: true }
    );

    if (!claimed) return; // lost the race, or no longer eligible - skip silently

    const occurrenceKey = `SCHED:${claimed._id.toString()}:${claimed.nextRunAt.getTime()}`;

    try {
        const outcome = await payoutEngine.submitPayout({
            userId: claimed.userId,
            amount: claimed.amount,
            beneficiary_name: claimed.beneficiary_name,
            account_number: claimed.account_number,
            ifsc_code: claimed.ifsc_code,
            bank_name: claimed.bank_name,
            extra: { scheduledPayoutId: claimed._id, remarks: claimed.remarks || '' },
            idempotency: { key: occurrenceKey, requestType: 'SCHEDULED_PAYOUT' },
        });

        const payout = outcome.payout || outcome.body?.payout;
        const resultStatus = payout?.status || 'unknown';

        claimed.lastRunAt = new Date();
        claimed.lastRunStatus = resultStatus;
        claimed.lastPayoutId = payout?._id || null;
        claimed.lastError = '';
        claimed.runCount += 1;
        if (resultStatus === 'failed') claimed.failCount += 1;

        const now = new Date();
        const pastEnd = claimed.endDate && now >= claimed.endDate;

        if (claimed.frequency === 'once' || pastEnd) {
            claimed.status = 'completed';
        } else {
            claimed.nextRunAt = computeNextRun(claimed.frequency, claimed.nextRunAt);
            claimed.status = 'active';
        }

        await claimed.save();

        logger.info('scheduledPayout.executed', {
            scheduleId: claimed._id.toString(),
            payoutId: payout?._id?.toString(),
            status: resultStatus,
        });
    } catch (error) {
        // Insufficient balance, validation error, etc. - do NOT silently
        // drop the schedule; revert it to 'active' so it retries on the
        // next tick (nextRunAt is unchanged, so the same occurrence key
        // is reused - never double-pays once it does succeed).
        claimed.status = 'active';
        claimed.lastRunStatus = 'error';
        claimed.lastError = error.message;
        claimed.lastRunAt = new Date();
        await claimed.save();

        logger.error('scheduledPayout.executionFailed', {
            scheduleId: claimed._id.toString(),
            error: error.message,
        });
    }
};

const tick = async () => {
    try {
        const due = await ScheduledPayout.find({
            status: 'active',
            nextRunAt: { $lte: new Date() },
        }).select('_id nextRunAt');

        for (const schedule of due) {
            await executeSchedule(schedule._id, schedule.nextRunAt);
        }
    } catch (error) {
        logger.error('scheduledPayout.tickFailed', { error: error.message });
    }
};

let intervalHandle = null;

const start = () => {
    if (intervalHandle) return;
    intervalHandle = setInterval(tick, POLL_INTERVAL_MS);
    // Run once shortly after boot too, instead of waiting a full interval.
    setTimeout(tick, 5000);
    logger.info('scheduledPayout.runnerStarted', { pollIntervalMs: POLL_INTERVAL_MS });
};

const stop = () => {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
};

module.exports = { start, stop, tick, computeNextRun };
