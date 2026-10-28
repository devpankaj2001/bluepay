const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const auth = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

// Get settings (Public or User level to view bank details)
router.get('/', auth, settingsController.getSettings);

// Update settings (Admin only)
router.put('/', auth, isAdmin, settingsController.updateSettings);

module.exports = router;
