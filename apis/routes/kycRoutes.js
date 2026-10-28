const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { uploadMiddleware, getKYCStatus, submitKYC } = require('../controllers/kycController');

router.get('/status', auth, getKYCStatus);
router.post('/submit', auth, (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
        if (err) return res.status(400).json({ msg: err.message });
        next();
    });
}, submitKYC);

module.exports = router;
