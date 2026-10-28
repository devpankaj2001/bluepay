const express = require('express');
const crypto = require('crypto');
const multer = require('multer');

const router = express.Router();
const bulkPayoutController = require('../controllers/bulkPayoutController');
const auth = require('../middleware/authMiddleware');
const idempotency = require('../middleware/idempotencyMiddleware');

// CSV files only, kept in memory (never written to disk - parsed and discarded).
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB is plenty for a payout CSV
    fileFilter: (req, file, cb) => {
        const isCsv =
            file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.originalname.toLowerCase().endsWith('.csv');
        if (!isCsv) {
            return cb(new Error('Only CSV files are allowed'));
        }
        cb(null, true);
    },
});

// Stamps a hash of the uploaded file's content onto req.body so the
// idempotency middleware's default payload hash (of req.body) actually
// changes if a different file is uploaded under the same Idempotency-Key.
const stampFileHash = (req, res, next) => {
    if (req.file) {
        req.body._fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    }
    next();
};

// Wraps upload.single('file') so multer/fileFilter errors (wrong type, too
// large, no file) become a clean JSON 400 instead of falling through to
// Express's default HTML error page.
const uploadCsv = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ msg: err.message || 'Invalid file upload' });
        }
        next();
    });
};

router.get('/template', auth, bulkPayoutController.downloadTemplate);
router.get('/', auth, bulkPayoutController.getBulkBatches);
router.get('/:id', auth, bulkPayoutController.getBulkBatchById);

router.post('/validate', auth, uploadCsv, bulkPayoutController.validateBulkFile);

// Money-moving: guarded by idempotency the same way createPayout is.
router.post(
    '/',
    auth,
    uploadCsv,
    stampFileHash,
    idempotency('BULK_PAYOUT'),
    bulkPayoutController.createBulkPayout
);

module.exports = router;
