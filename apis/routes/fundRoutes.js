const express = require('express');
const router = express.Router();
const fundController = require('../controllers/fundController');
const ccavenueController = require('../controllers/ccavenueController');
const auth = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const idempotency = require('../middleware/idempotencyMiddleware');
const multer = require('multer');
const path = require('path');

// Multer config for screenshot upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `receipt_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// User routes
// Idempotency runs AFTER multer so req.body (multipart text fields) is
// already parsed and available for hashing.
router.post(
    '/',
    auth,
    upload.single('receipt'),
    idempotency('FUNDING', {
        pickPayload: (body) => ({
            amount: body.amount,
            utr_number: body.utr_number,
            remarks: body.remarks,
        }),
    }),
    fundController.createFundRequest
);
router.get('/my-requests', auth, fundController.getUserFundRequests);
router.get('/wallet-overview', auth, fundController.walletOverview);

// ------------------------------------------------------------
// CCAvenue online funding (Step 11)
// ------------------------------------------------------------
//
// initiate  -> merchant-authenticated, creates an INITIATED order only.
// response  -> called by CCAvenue itself (no merchant JWT available),
//              this is the ONLY place a wallet can be credited from an
//              online payment. Protected by decryption with the backend
//              Working Key + server-side amount/order verification, not
//              by auth middleware.
// status    -> merchant-authenticated, read-only, used by the frontend
//              to display the outcome (it never credits anything).
router.post('/ccavenue/initiate', auth, ccavenueController.initiateOrder);
router.post('/ccavenue/response', ccavenueController.handleResponse);
router.get('/ccavenue/status/:orderId', auth, ccavenueController.getOrderStatus);

// Admin routes
router.get('/', auth, isAdmin, fundController.getAllFundRequests);
router.get('/:id/receipt', auth, isAdmin, fundController.getReceipt);
router.put('/:id/status', auth, isAdmin, fundController.updateFundRequestStatus);

module.exports = router;
