const express = require('express');
const auth = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const adminReportsController = require('../controllers/adminReportsController');
const adminKycController = require('../controllers/adminKycController');
const adminKotakApiLogsController = require('../controllers/adminKotakApiLogsController');

const router = express.Router();

router.get('/dashboard', auth, isAdmin, adminController.getDashboardStats);
router.get('/reports/transactions', auth, isAdmin, adminReportsController.getTransactions);
router.get('/reports/transaction-logs', auth, isAdmin, adminReportsController.getTransactionLogs);
router.get('/reports/wallets', auth, isAdmin, adminReportsController.getWallets);
router.get('/reports/api-usage', auth, isAdmin, adminReportsController.getApiUsage);
router.get('/kotak-api-logs', auth, isAdmin, adminKotakApiLogsController.getKotakApiLogs);
router.get('/reports/export', auth, isAdmin, adminReportsController.exportReport);
router.get('/kyc', auth, isAdmin, adminKycController.listKyc);
router.put('/kyc/:id/review', auth, isAdmin, adminKycController.reviewKyc);
router.get('/kyc/:id/document/:field', auth, isAdmin, adminKycController.getDocument);

module.exports = router;