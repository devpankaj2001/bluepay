const crypto = require("crypto");

const WebhookEndpoint = require("../models/WebhookEndpoint");
const WebhookDelivery = require("../models/WebhookDelivery");
const { validateWebhookUrl } = require("../utils/webhookSecurity");
const { requeueDelivery } = require("../services/webhookService");
const logger = require("../utils/logger");
const { encryptSecret } = require("../utils/webhookSecret");
const { logActivity } = require("../utils/activityLogger");

const VALID_EVENTS = ["payout.success", "payout.failed", "payout.processing", "payout.unknown", "wallet.credited"];

const generateSecret = () => `whsec_${crypto.randomBytes(24).toString("hex")}`;

const ensureEncryptedSecret = async (endpoint) => {
    if (endpoint.secretEncrypted || !endpoint.secret) return endpoint;
    endpoint.secretEncrypted = encryptSecret(endpoint.secret);
    endpoint.secret = undefined;
    await endpoint.save();
    return endpoint;
};

const toSafeEndpoint = (endpoint) => {
    const plain = typeof endpoint.toObject === "function" ? endpoint.toObject() : { ...endpoint };
    delete plain.secret;
    delete plain.secretEncrypted;
    return plain;
};

const toSafeDelivery = (delivery) => ({
    _id: delivery._id,
    webhookId: delivery.webhookId,
    eventId: delivery.eventId,
    event: delivery.event,
    environment: delivery.environment,
    endpointUrl: delivery.endpointUrl,
    status: delivery.status,
    attempts: delivery.attempts,
    responseCode: delivery.responseCode,
    responseMessage: delivery.responseMessage,
    lastAttemptAt: delivery.lastAttemptAt,
    nextRetryAt: delivery.nextRetryAt,
    deliveredAt: delivery.deliveredAt,
    createdAt: delivery.createdAt,
});

/**
 * Everything below (`_create`/`_list`/`_update`/`_regenerateSecret`/
 * `_delete`/`_listDeliveries`/`_resendDelivery`) is the ONE implementation
 * of webhook config/delivery logic, parameterized by an already-resolved
 * `userId` - it never trusts a userId supplied in a request body/query.
 * The merchant routes resolve that id from the merchant's own JWT
 * (`req.user.id`); the admin routes resolve it from `req.params.userId`
 * only after `requireManagedMerchant` (adminWebhookRoutes.js) has verified
 * that id is a real, non-superadmin user. Neither path lets a caller pick
 * an arbitrary id out of thin air.
 */

const _createEndpoint = async (userId, { url, events, environment = "live" }) => {
    if (!["test", "live"].includes(environment)) {
        return { statusCode: 400, body: { msg: "Environment must be test or live" } };
    }

    if (!url || typeof url !== "string") {
        return { statusCode: 400, body: { msg: "Webhook URL is required" } };
    }

    if (environment === "live" && !url.trim().startsWith("https://")) {
        return { statusCode: 400, body: { msg: "Live webhook URLs must use HTTPS" } };
    }

    const selectedEvents = Array.isArray(events) ? events.filter((e) => VALID_EVENTS.includes(e)) : [];

    if (!selectedEvents.length) {
        return { statusCode: 400, body: { msg: `At least one valid event is required. Valid events: ${VALID_EVENTS.join(", ")}` } };
    }

    const urlCheck = await validateWebhookUrl(url);

    if (!urlCheck.valid) {
        return { statusCode: 400, body: { msg: `Invalid webhook URL: ${urlCheck.reason}` } };
    }

    const secret = generateSecret();

    const endpoint = await WebhookEndpoint.create({
        userId,
        url: url.trim(),
        environment,
        secretEncrypted: encryptSecret(secret),
        events: selectedEvents,
        isActive: true,
    });

    logger.info("webhook.endpoint.created", { userId: userId.toString(), endpointId: endpoint._id.toString() });

    return {
        statusCode: 201,
        body: {
            success: true,
            msg: "Webhook endpoint created. Save this secret now - it will not be shown again.",
            endpoint: { ...toSafeEndpoint(endpoint), secret },
        },
    };
};

const _listEndpoints = async (userId) => {
    const endpoints = await WebhookEndpoint.find({ userId }).sort({ createdAt: -1 }).select("+secretEncrypted secret");
    await Promise.all(endpoints.map(ensureEncryptedSecret));
    return { statusCode: 200, body: { success: true, endpoints: endpoints.map(toSafeEndpoint) } };
};

const _updateEndpoint = async (userId, endpointId, patch) => {
    const endpoint = await WebhookEndpoint.findOne({ _id: endpointId, userId }).select("+secretEncrypted secret");

    if (!endpoint) {
        return { statusCode: 404, body: { msg: "Webhook endpoint not found" } };
    }

    if (patch.url !== undefined) {
        const urlCheck = await validateWebhookUrl(patch.url);
        if (!urlCheck.valid) {
            return { statusCode: 400, body: { msg: `Invalid webhook URL: ${urlCheck.reason}` } };
        }
        endpoint.url = String(patch.url).trim();
    }

    if (patch.environment !== undefined) {
        if (!["test", "live"].includes(patch.environment)) {
            return { statusCode: 400, body: { msg: "Environment must be test or live" } };
        }
        endpoint.environment = patch.environment;
    }

    if (endpoint.environment === "live" && !endpoint.url.startsWith("https://")) {
        return { statusCode: 400, body: { msg: "Live webhook URLs must use HTTPS" } };
    }

    if (patch.events !== undefined) {
        const selectedEvents = Array.isArray(patch.events) ? patch.events.filter((e) => VALID_EVENTS.includes(e)) : [];
        if (!selectedEvents.length) {
            return { statusCode: 400, body: { msg: `At least one valid event is required. Valid events: ${VALID_EVENTS.join(", ")}` } };
        }
        endpoint.events = selectedEvents;
    }

    const previouslyActive = endpoint.isActive;
    let activeFlagChanged = false;

    if (patch.isActive !== undefined) {
        const nextActive = Boolean(patch.isActive);
        activeFlagChanged = nextActive !== previouslyActive;
        endpoint.isActive = nextActive;
    }

    if (!endpoint.secretEncrypted && endpoint.secret) {
        endpoint.secretEncrypted = encryptSecret(endpoint.secret);
        endpoint.secret = undefined;
    }

    try {
        await endpoint.save();
    } catch (error) {
        if (error.code === 11000) {
            return { statusCode: 409, body: { msg: "This merchant already has a webhook registered for this URL" } };
        }
        throw error;
    }

    return {
        statusCode: 200,
        body: { success: true, endpoint: toSafeEndpoint(endpoint) },
        activity: activeFlagChanged
            ? { action: endpoint.isActive ? "WEBHOOK_ENDPOINT_ENABLED" : "WEBHOOK_ENDPOINT_DISABLED", description: `Webhook endpoint ${endpoint.isActive ? "enabled" : "disabled"}` }
            : { action: "WEBHOOK_ENDPOINT_UPDATED", description: "Webhook endpoint updated" },
        environment: endpoint.environment,
        endpointId: endpoint._id,
    };
};

const _regenerateSecret = async (userId, endpointId) => {
    const endpoint = await WebhookEndpoint.findOne({ _id: endpointId, userId }).select("+secretEncrypted secret");

    if (!endpoint) {
        return { statusCode: 404, body: { msg: "Webhook endpoint not found" } };
    }

    const secret = generateSecret();
    endpoint.secretEncrypted = encryptSecret(secret);
    endpoint.secret = undefined;
    await endpoint.save();

    logger.info("webhook.endpoint.secretRotated", { userId: userId.toString(), endpointId: endpoint._id.toString() });

    return {
        statusCode: 200,
        body: {
            success: true,
            msg: "Secret rotated. Save this now - it will not be shown again.",
            endpoint: { ...toSafeEndpoint(endpoint), secret },
        },
        environment: endpoint.environment,
        endpointId: endpoint._id,
    };
};

const _deleteEndpoint = async (userId, endpointId) => {
    const endpoint = await WebhookEndpoint.findOneAndDelete({ _id: endpointId, userId });

    if (!endpoint) {
        return { statusCode: 404, body: { msg: "Webhook endpoint not found" } };
    }

    return { statusCode: 200, body: { success: true, msg: "Webhook endpoint deleted" }, environment: endpoint.environment, endpointId: endpoint._id };
};

const _listDeliveries = async (userId, { endpointId, status, environment, page = 1, limit = 20 } = {}) => {
    const query = { userId };

    if (endpointId) {
        const owns = await WebhookEndpoint.exists({ _id: endpointId, userId });
        if (!owns) {
            return { statusCode: 404, body: { msg: "Webhook endpoint not found" } };
        }
        query.webhookId = endpointId;
    }

    if (status) query.status = status;
    if (environment) query.environment = environment;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [deliveries, total] = await Promise.all([
        WebhookDelivery.find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean(),
        WebhookDelivery.countDocuments(query),
    ]);

    return {
        statusCode: 200,
        body: {
            success: true,
            deliveries: deliveries.map(toSafeDelivery),
            total,
            page: pageNum,
            pages: Math.max(1, Math.ceil(total / limitNum)),
        },
    };
};

const _resendDelivery = async (userId, deliveryId) => {
    const delivery = await WebhookDelivery.findOne({ _id: deliveryId, userId });

    if (!delivery) {
        return { statusCode: 404, body: { msg: "Webhook delivery not found" } };
    }

    const updated = await requeueDelivery(delivery);
    return { statusCode: 200, body: { success: true, msg: "Delivery queued for resend", delivery: toSafeDelivery(updated) } };
};

// ---------------------------------------------------------------------
// MERCHANT routes: userId always comes from the merchant's own JWT.
// ---------------------------------------------------------------------

exports.createEndpoint = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await _createEndpoint(userId, req.body);
        if (result.statusCode === 201) {
            logActivity({ userId, type: "USER_ACTIVITY", action: "WEBHOOK_ENDPOINT_CREATED", description: "Webhook endpoint created", resourceType: "WEBHOOK_ENDPOINT", resourceId: result.body.endpoint._id, req, environment: result.body.endpoint.environment, metadata: { events: result.body.endpoint.events } });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ msg: "You already have a webhook registered for this URL" });
        console.error("createEndpoint:", error.message);
        return res.status(500).json({ msg: "Failed to create webhook endpoint", requestId: req.requestId });
    }
};

exports.listEndpoints = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await _listEndpoints(userId);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("listEndpoints:", error.message);
        return res.status(500).json({ msg: "Failed to load webhook endpoints", requestId: req.requestId });
    }
};

exports.updateEndpoint = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await _updateEndpoint(userId, req.params.id, req.body);
        if (result.activity) {
            logActivity({ userId, type: "USER_ACTIVITY", ...result.activity, resourceType: "WEBHOOK_ENDPOINT", resourceId: result.endpointId, req, environment: result.environment });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("updateEndpoint:", error.message);
        return res.status(500).json({ msg: "Failed to update webhook endpoint", requestId: req.requestId });
    }
};

exports.regenerateSecret = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await _regenerateSecret(userId, req.params.id);
        if (result.statusCode === 200) {
            logActivity({ userId, type: "USER_ACTIVITY", action: "WEBHOOK_SECRET_REGENERATED", description: "Webhook signing secret regenerated", resourceType: "WEBHOOK_ENDPOINT", resourceId: result.endpointId, req, environment: result.environment });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("regenerateSecret:", error.message);
        return res.status(500).json({ msg: "Failed to rotate webhook secret", requestId: req.requestId });
    }
};

exports.deleteEndpoint = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await _deleteEndpoint(userId, req.params.id);
        if (result.statusCode === 200) {
            logActivity({ userId, type: "USER_ACTIVITY", action: "WEBHOOK_ENDPOINT_DELETED", description: "Webhook endpoint deleted", resourceType: "WEBHOOK_ENDPOINT", resourceId: result.endpointId, req, environment: result.environment });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("deleteEndpoint:", error.message);
        return res.status(500).json({ msg: "Failed to delete webhook endpoint", requestId: req.requestId });
    }
};

exports.listDeliveries = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await _listDeliveries(userId, req.query);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("listDeliveries:", error.message);
        return res.status(500).json({ msg: "Failed to load webhook deliveries", requestId: req.requestId });
    }
};

exports.resendDelivery = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await _resendDelivery(userId, req.params.id);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        if (error.message === "Only a failed delivery can be manually resent") {
            return res.status(400).json({ msg: error.message });
        }
        console.error("resendDelivery:", error.message);
        return res.status(500).json({ msg: "Failed to resend webhook delivery", requestId: req.requestId });
    }
};

// ---------------------------------------------------------------------
// ADMIN routes: userId comes from req.targetUserId, set by
// adminWebhookRoutes.js's requireManagedMerchant middleware after
// verifying req.params.userId is a real, non-superadmin user. The admin's
// own id (req.user.id) is never used to select whose webhooks are shown.
// ---------------------------------------------------------------------

exports.adminListEndpoints = async (req, res) => {
    try {
        const result = await _listEndpoints(req.targetUserId);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("adminListEndpoints:", error.message);
        return res.status(500).json({ msg: "Failed to load webhook endpoints", requestId: req.requestId });
    }
};

exports.adminCreateEndpoint = async (req, res) => {
    try {
        const result = await _createEndpoint(req.targetUserId, req.body);
        if (result.statusCode === 201) {
            logActivity({ userId: req.targetUserId, type: "USER_ACTIVITY", action: "WEBHOOK_ENDPOINT_CREATED", description: "Webhook endpoint created by admin", resourceType: "WEBHOOK_ENDPOINT", resourceId: result.body.endpoint._id, req, environment: result.body.endpoint.environment, metadata: { events: result.body.endpoint.events, adminId: (req.user.id || req.user._id).toString() } });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ msg: "This merchant already has a webhook registered for this URL" });
        console.error("adminCreateEndpoint:", error.message);
        return res.status(500).json({ msg: "Failed to create webhook endpoint", requestId: req.requestId });
    }
};

exports.adminUpdateEndpoint = async (req, res) => {
    try {
        const result = await _updateEndpoint(req.targetUserId, req.params.id, req.body);
        if (result.activity) {
            logActivity({ userId: req.targetUserId, type: "USER_ACTIVITY", ...result.activity, description: `${result.activity.description} by admin`, resourceType: "WEBHOOK_ENDPOINT", resourceId: result.endpointId, req, environment: result.environment, metadata: { adminId: (req.user.id || req.user._id).toString() } });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("adminUpdateEndpoint:", error.message);
        return res.status(500).json({ msg: "Failed to update webhook endpoint", requestId: req.requestId });
    }
};

exports.adminRegenerateSecret = async (req, res) => {
    try {
        const result = await _regenerateSecret(req.targetUserId, req.params.id);
        if (result.statusCode === 200) {
            logActivity({ userId: req.targetUserId, type: "USER_ACTIVITY", action: "WEBHOOK_SECRET_REGENERATED", description: "Webhook signing secret regenerated by admin", resourceType: "WEBHOOK_ENDPOINT", resourceId: result.endpointId, req, environment: result.environment, metadata: { adminId: (req.user.id || req.user._id).toString() } });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("adminRegenerateSecret:", error.message);
        return res.status(500).json({ msg: "Failed to rotate webhook secret", requestId: req.requestId });
    }
};

exports.adminDeleteEndpoint = async (req, res) => {
    try {
        const result = await _deleteEndpoint(req.targetUserId, req.params.id);
        if (result.statusCode === 200) {
            logActivity({ userId: req.targetUserId, type: "USER_ACTIVITY", action: "WEBHOOK_ENDPOINT_DELETED", description: "Webhook endpoint deleted by admin", resourceType: "WEBHOOK_ENDPOINT", resourceId: result.endpointId, req, environment: result.environment, metadata: { adminId: (req.user.id || req.user._id).toString() } });
        }
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("adminDeleteEndpoint:", error.message);
        return res.status(500).json({ msg: "Failed to delete webhook endpoint", requestId: req.requestId });
    }
};

exports.adminListDeliveries = async (req, res) => {
    try {
        const result = await _listDeliveries(req.targetUserId, req.query);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error("adminListDeliveries:", error.message);
        return res.status(500).json({ msg: "Failed to load webhook deliveries", requestId: req.requestId });
    }
};

exports.adminResendDelivery = async (req, res) => {
    try {
        const result = await _resendDelivery(req.targetUserId, req.params.id);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        if (error.message === "Only a failed delivery can be manually resent") {
            return res.status(400).json({ msg: error.message });
        }
        console.error("adminResendDelivery:", error.message);
        return res.status(500).json({ msg: "Failed to resend webhook delivery", requestId: req.requestId });
    }
};

module.exports.VALID_EVENTS = VALID_EVENTS;
