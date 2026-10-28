const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhookController");
const auth = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/authMiddleware");
const requireManagedMerchant = require("../middleware/requireManagedMerchant");
const { webhookConfigLimiter } = require("../config/security");

router.get("/events", auth, isAdmin, (req, res) => res.json({ events: webhookController.VALID_EVENTS }));

router.get("/:userId/endpoints", auth, isAdmin, requireManagedMerchant, webhookController.adminListEndpoints);
router.post("/:userId/endpoints", auth, isAdmin, webhookConfigLimiter, requireManagedMerchant, webhookController.adminCreateEndpoint);
router.put("/:userId/endpoints/:id", auth, isAdmin, webhookConfigLimiter, requireManagedMerchant, webhookController.adminUpdateEndpoint);
router.post("/:userId/endpoints/:id/regenerate-secret", auth, isAdmin, webhookConfigLimiter, requireManagedMerchant, webhookController.adminRegenerateSecret);
router.delete("/:userId/endpoints/:id", auth, isAdmin, webhookConfigLimiter, requireManagedMerchant, webhookController.adminDeleteEndpoint);

router.get("/:userId/deliveries", auth, isAdmin, requireManagedMerchant, webhookController.adminListDeliveries);
router.post("/:userId/deliveries/:id/resend", auth, isAdmin, requireManagedMerchant, webhookController.adminResendDelivery);

module.exports = router;
