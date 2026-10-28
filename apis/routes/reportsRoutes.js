const express = require('express');
const router = express.Router();

const adminReportsController = require('../controllers/adminReportsController');
const auth = require('../middleware/authMiddleware');

// Merchant-scoped reports. Same query logic as the admin reports
// (adminReportsController), just resolved against the authenticated
// merchant's own id (req.user.id) instead of admin's cross-merchant view -
// see wrapMerchant/getMy*/exportMyReport there. Deliberately `auth` only,
// not `isAdmin`: this is what the merchant dashboard's own Reports page
// should call instead of the admin-only /api/admin/reports/* routes.
router.get('/transactions', auth, adminReportsController.getMyTransactions);
router.get('/wallets', auth, adminReportsController.getMyWallet);
router.get('/api-usage', auth, adminReportsController.getMyApiUsage);
router.get('/export', auth, adminReportsController.exportMyReport);

module.exports = router;
