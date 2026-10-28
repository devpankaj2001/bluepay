const express = require("express");
const router = express.Router();

const activityController = require("../controllers/activityController");
const auth = require("../middleware/authMiddleware");

// All merchant-scoped and ownership-checked in the controller (always
// req.user's own id - never a body/query userId). No admin routes here;
// admin visibility into activity, if ever needed, belongs behind isAdmin
// on its own separate route, not mixed into this merchant-only file.
router.get("/user", auth, activityController.getUserActivity);
router.get("/api", auth, activityController.getApiActivity);
router.get("/login", auth, activityController.getLoginHistory);
router.get("/ip", auth, activityController.getIpLogs);

module.exports = router;
