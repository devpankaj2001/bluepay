const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhookController");
const auth = require("../middleware/authMiddleware");
const { webhookConfigLimiter } = require("../config/security");

// All routes are merchant-scoped (auth) and ownership-checked in the
// controller - a merchant can only ever see/manage their own endpoints and
// deliveries. Nothing here is admin-only, but nothing lets a merchant act
// on another merchant's data either.
router.post("/endpoints", auth, webhookConfigLimiter, webhookController.createEndpoint);
router.get("/endpoints", auth, webhookConfigLimiter, webhookController.listEndpoints);
router.put("/endpoints/:id", auth, webhookConfigLimiter, webhookController.updateEndpoint);
router.post("/endpoints/:id/regenerate-secret", auth, webhookConfigLimiter, webhookController.regenerateSecret);
router.delete("/endpoints/:id", auth, webhookConfigLimiter, webhookController.deleteEndpoint);

router.get("/deliveries", auth, webhookController.listDeliveries);
router.post("/deliveries/:id/resend", auth, webhookController.resendDelivery);

module.exports = router;
