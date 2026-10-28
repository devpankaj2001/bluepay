/**
 * Merchant webhook delivery.
 *
 * createWebhookEvent() - called by payoutEngine.applyProviderResult after a
 * payout's status is persisted. Creates one WebhookDelivery row per active,
 * subscribed endpoint. Deduplicated per (endpoint, payout, event) so a
 * reconciliation job re-confirming the SAME non-final status (e.g. another
 * "still unknown" poll) never produces a second event for the same state
 * transition.
 *
 * deliverWebhookAttempt() - does the actual HTTP send: re-validates the
 * destination against SSRF rules right before every send (not just at
 * registration), signs the exact bytes it transmits, never follows
 * redirects, and schedules capped exponential-backoff retries. Called by
 * schedulers/webhookDispatcher.js, which is what actually drives delivery -
 * this module never sends anything on its own timer.
 */

const crypto = require("crypto");

const WebhookEndpoint = require("../models/WebhookEndpoint");
const WebhookDelivery = require("../models/WebhookDelivery");
const { validateWebhookUrl } = require("../utils/webhookSecurity");
const logger = require("../utils/logger");
const { decryptSecret } = require("../utils/webhookSecret");
const { maskAccountNumber } = require("../utils/mask");

const MAX_ATTEMPTS = 6;
const BACKOFF_MINUTES = [1, 5, 15, 60, 180]; // delay before attempt 2,3,4,5,6
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Signs the EXACT string that will be transmitted as the request body.
 * Never re-stringify the payload separately for signing vs. sending - key
 * order / whitespace drift between the two would make the signature the
 * merchant computes on their end not match what was actually sent.
 */
const generateSignature = (rawBody, secret) =>
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

const createWebhookEvent = async ({ userId, event, payout }) => {
    const environment = payout.environment || "live";
    const endpoints = await WebhookEndpoint.find({
        userId,
        environment,
        isActive: true,
        events: event,
    }).select("+secretEncrypted secret environment url events isActive");

    if (!endpoints.length) {
        return [];
    }

    const payoutId = payout._id.toString();

    const basePayload = {
        event,
        timestamp: new Date().toISOString(),
        environment,

        data: {
            payoutId,
            amount: payout.amount,
            status: payout.status,

            beneficiary: {
                name: payout.beneficiary_name,
                accountNumber: maskAccountNumber(payout.account_number),
                ifsc: payout.ifsc_code,
                bankName: payout.bank_name,
            },

            transactionId: payout.txn_id || null,
            providerReference: payout.providerReference || null,
            providerTransactionId: payout.providerTransactionId || null,

            createdAt: payout.createdAt,
            completedAt: payout.completedAt || null,
        },
    };

    const deliveries = [];

    for (const endpoint of endpoints) {
        // Dedup guard: one delivery per (endpoint, payout, event) ever - a
        // reconciliation poll that reconfirms the same non-final status
        // must never fan out a second identical webhook event.
        const alreadyExists = await WebhookDelivery.exists({
            webhookId: endpoint._id,
            event,
            "payload.data.payoutId": payoutId,
        });

        if (alreadyExists) {
            continue;
        }

        try {
            const eventId = `evt_${crypto.randomUUID()}`;
            const delivery = await WebhookDelivery.create({
                webhookId: endpoint._id,
                userId,
                eventId,
                event,
                environment,
                endpointUrl: endpoint.url,
                payload: { ...basePayload, eventId },
                status: "pending",
                attempts: 0,
                nextRetryAt: new Date(), // eligible for immediate pickup by the dispatcher
            });

            deliveries.push(delivery);
        } catch (err) {
            // Unique index on eventId - a genuinely concurrent duplicate
            // insert is a no-op, not a failure worth surfacing.
            if (err.code !== 11000) {
                logger.error("webhook.createEvent.failed", {
                    userId: userId.toString(),
                    endpointId: endpoint._id.toString(),
                    event,
                    error: err.message,
                });
            }
        }
    }

    return deliveries;
};

const scheduleRetryOrFail = (delivery, reasonMessage) => {
    delivery.responseMessage = reasonMessage.slice(0, 500);

    if (delivery.attempts >= MAX_ATTEMPTS) {
        delivery.status = "failed";
        delivery.nextRetryAt = null;
    } else {
        delivery.status = "retrying";
        const minutes = BACKOFF_MINUTES[Math.min(delivery.attempts - 1, BACKOFF_MINUTES.length - 1)];
        delivery.nextRetryAt = new Date(Date.now() + minutes * 60 * 1000);
    }
};

/**
 * Performs exactly one delivery attempt for an already-claimed
 * WebhookDelivery document (see schedulers/webhookDispatcher.js for the
 * atomic claim that guarantees only one process attempts a given delivery
 * at a time). Always saves the document with the outcome before returning.
 */
const deliverWebhookAttempt = async (delivery) => {
    const endpoint = await WebhookEndpoint.findById(delivery.webhookId).lean();

    delivery.lastAttemptAt = new Date();

    if (!endpoint || !endpoint.isActive) {
        delivery.status = "failed";
        delivery.responseMessage = "Webhook endpoint no longer active";
        delivery.nextRetryAt = null;
        await delivery.save();
        return delivery;
    }

    // Re-validate right before send - defends against DNS rebinding and
    // against the endpoint URL having been edited to a private target after
    // this delivery was already queued.
    const urlCheck = await validateWebhookUrl(endpoint.url);

    if (!urlCheck.valid || (endpoint.environment === "live" && !endpoint.url.startsWith("https://"))) {
        delivery.status = "failed";
        delivery.responseMessage = endpoint.environment === "live" && !endpoint.url.startsWith("https://")
            ? "Blocked destination: Live webhook URLs must use HTTPS"
            : `Blocked destination: ${urlCheck.reason}`;
        delivery.nextRetryAt = null;
        await delivery.save();

        logger.error("webhook.delivery.blocked", {
            deliveryId: delivery._id.toString(),
            endpointId: endpoint._id.toString(),
            reason: urlCheck.reason,
        });

        return delivery;
    }

    delivery.attempts += 1;

    const rawBody = JSON.stringify(delivery.payload);
    let signingSecret;
    try {
        signingSecret = endpoint.secretEncrypted
            ? decryptSecret(endpoint.secretEncrypted)
            : endpoint.secret;
    } catch (secretError) {
        delivery.status = "failed";
        delivery.responseMessage = "Webhook signing secret is unavailable";
        delivery.nextRetryAt = null;
        await delivery.save();
        logger.error("webhook.delivery.secretUnavailable", {
            deliveryId: delivery._id.toString(),
            endpointId: endpoint._id.toString(),
        });
        return delivery;
    }
    const signature = generateSignature(rawBody, signingSecret);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(endpoint.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-BluePay-Event": delivery.event,
                "X-BluePay-Event-Id": delivery.eventId,
                "X-BluePay-Timestamp": timestamp,
                "X-BluePay-Signature": `t=${timestamp},v1=${signature}`,
                "X-BluePay-Delivery-Attempt": String(delivery.attempts),
                "User-Agent": "BluePay-Webhooks/1.0",
            },
            body: rawBody,
            signal: controller.signal,
            redirect: "manual", // never silently follow a redirect to an unvalidated destination
        });

        delivery.responseCode = response.status;

        if (response.status >= 200 && response.status < 300) {
            delivery.status = "delivered";
            delivery.responseMessage = "Delivered";
            delivery.nextRetryAt = null;
            delivery.deliveredAt = new Date();
        } else if (response.status >= 300 && response.status < 400) {
            scheduleRetryOrFail(delivery, "Blocked: destination attempted a redirect");
        } else if (response.status >= 400 && response.status < 500) {
            delivery.status = "failed";
            delivery.responseMessage = `Permanent client response: ${response.status}`;
            delivery.nextRetryAt = null;
        } else {
            scheduleRetryOrFail(delivery, `Non-2xx response: ${response.status}`);
        }
    } catch (err) {
        delivery.responseCode = null;
        scheduleRetryOrFail(delivery, `Request error: ${err.message}`);
    } finally {
        clearTimeout(timeoutHandle);
    }

    await delivery.save();

    logger.info("webhook.delivery.attempt", {
        deliveryId: delivery._id.toString(),
        event: delivery.event,
        attempts: delivery.attempts,
        status: delivery.status,
        responseCode: delivery.responseCode,
    });

    return delivery;
};

/**
 * Merchant/admin-triggered manual redelivery of a failed delivery. Reuses
 * the SAME delivery document (same eventId) rather than creating a new
 * event - replaying, not duplicating.
 */
const requeueDelivery = async (delivery) => {
    if (delivery.status !== "failed") {
        throw new Error("Only a failed delivery can be manually resent");
    }

    delivery.status = "pending";
    delivery.attempts = 0;
    delivery.responseMessage = "";
    delivery.responseCode = null;
    delivery.nextRetryAt = new Date();

    await delivery.save();
    return delivery;
};

module.exports = {
    generateSignature,
    createWebhookEvent,
    deliverWebhookAttempt,
    requeueDelivery,
    MAX_ATTEMPTS,
};
