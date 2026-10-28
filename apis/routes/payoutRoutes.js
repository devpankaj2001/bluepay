const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const auth = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const idempotency = require('../middleware/idempotencyMiddleware');

// Money-moving: creating a payout locks wallet balance, so it must never
// be allowed to run twice for the same client request.
router.post('/', auth, idempotency('PAYOUT'), payoutController.createPayout);

// Merchant: own payouts (History / Failed tabs share this with different
// default filters applied client-side).
router.get('/my-payouts', auth, payoutController.getUserPayouts);
router.get('/my-payouts/:id', auth, payoutController.getUserPayoutById);
router.post('/my-payouts/:id/status-check', auth, payoutController.merchantCheckStatus);
router.post('/my-payouts/:id/retry', auth, payoutController.merchantRetryPayout);

// Admin Routes
router.get('/', auth, isAdmin, payoutController.getAllPayouts);
router.put('/:id/status', auth, isAdmin, payoutController.updatePayoutStatus);
router.get('/user/:id', auth, isAdmin, payoutController.getUserDetailsForAdmin);

// Kotak provider reconciliation - internal/admin only, never exposed publicly.
router.post('/:id/status-check', auth, isAdmin, payoutController.checkPayoutStatus);
router.post('/:id/retry', auth, isAdmin, payoutController.retryPayout);

module.exports = router;
