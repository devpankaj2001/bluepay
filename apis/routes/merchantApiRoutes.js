const express = require('express');
const payoutController = require('../controllers/payoutController');
const fundController = require('../controllers/fundController');
const merchantApiAuth = require('../middleware/merchantApiAuth');
const { requireApiScope } = require('../middleware/merchantApiAuth');
const idempotency = require('../middleware/idempotencyMiddleware');
const { merchantApiLimiter } = require('../config/security');
const { validateMerchantPayout, validateMerchantPayoutQuery } = require('../middleware/inputValidation');
const apiRequestMetrics = require('../middleware/apiRequestMetrics');

const router = express.Router();

router.post('/payouts', merchantApiLimiter, merchantApiAuth, apiRequestMetrics, validateMerchantPayout, requireApiScope('payouts:write'), idempotency('PAYOUT'), payoutController.createPayout);
router.get('/payouts', merchantApiLimiter, merchantApiAuth, apiRequestMetrics, validateMerchantPayoutQuery, requireApiScope('payouts:read'), payoutController.getUserPayouts);
router.get('/payouts/:id', merchantApiLimiter, merchantApiAuth, apiRequestMetrics, requireApiScope('payouts:read'), payoutController.getUserPayoutById);
router.get('/payouts/:id/status', merchantApiLimiter, merchantApiAuth, apiRequestMetrics, requireApiScope('payouts:read'), payoutController.merchantCheckStatus);
router.get('/wallet/balance', merchantApiLimiter, merchantApiAuth, apiRequestMetrics, requireApiScope('wallet:read'), fundController.walletOverview);

module.exports = router;