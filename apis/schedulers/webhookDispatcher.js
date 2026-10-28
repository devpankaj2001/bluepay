/**
 * Webhook delivery dispatcher.
 *
 * Polls for WebhookDelivery documents due to be (re)sent and drives them
 * through services/webhookService.deliverWebhookAttempt. Deliberately a
 * plain DB-poll interval (same shape as scheduledPayoutRunner.js) rather
 * than a BullMQ consumer - webhook delivery must not depend on Redis being
 * up, since Redis being briefly unavailable is exactly the kind of thing
 * that should never cause a merchant event to be silently lost.
 *
 * Duplicate-delivery safety: a due delivery is atomically claimed via
 * findOneAndUpdate flipping status 'pending'/'retrying' -> 'sending' with a
 * staleness guard, so two overlapping ticks (or two app instances) can
 * never both attempt the same delivery concurrently. If the process crashes
 * mid-send, the delivery is left in 'sending' and picked up again once
 * SENDING_STALE_MS has passed (treated as if the attempt never happened -
 * safe because deliverWebhookAttempt is a single idempotent HTTP POST per
 * attempt, and the receiving merchant is expected to dedupe by eventId).
 */

const WebhookDelivery = require("../models/WebhookDelivery");
const { deliverWebhookAttempt } = require("../services/webhookService");
const logger = require("../utils/logger");

const POLL_INTERVAL_MS = 15 * 1000; // 15 seconds - deliveries should go out promptly
const BATCH_SIZE = 25;
const SENDING_STALE_MS = 2 * 60 * 1000; // reclaim a delivery stuck in 'sending' after 2 minutes

const claimNextDelivery = async () => {
    const staleBefore = new Date(Date.now() - SENDING_STALE_MS);

    return WebhookDelivery.findOneAndUpdate(
        {
            $or: [
                { status: { $in: ["pending", "retrying"] }, nextRetryAt: { $lte: new Date() } },
                { status: "sending", lastAttemptAt: { $lte: staleBefore } },
            ],
        },
        { $set: { status: "sending", lastAttemptAt: new Date() } },
        { new: true, sort: { nextRetryAt: 1 } }
    );
};

const tick = async () => {
    try {
        for (let i = 0; i < BATCH_SIZE; i += 1) {
            const delivery = await claimNextDelivery();
            if (!delivery) break; // nothing left due right now

            try {
                await deliverWebhookAttempt(delivery);
            } catch (error) {
                logger.error("webhook.dispatcher.attemptCrashed", {
                    deliveryId: delivery._id.toString(),
                    error: error.message,
                });
                // Leave it claimed as 'sending' if deliverWebhookAttempt threw
                // before saving - SENDING_STALE_MS reclaim above will retry it.
            }
        }
    } catch (error) {
        logger.error("webhook.dispatcher.tickFailed", { error: error.message });
    }
};

let intervalHandle = null;

const start = () => {
    if (intervalHandle) return;
    intervalHandle = setInterval(tick, POLL_INTERVAL_MS);
    setTimeout(tick, 3000);
    logger.info("webhook.dispatcherStarted", { pollIntervalMs: POLL_INTERVAL_MS });
};

const stop = () => {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
};

module.exports = { start, stop, tick };
