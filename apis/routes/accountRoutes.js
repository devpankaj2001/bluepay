const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
    uploadMiddleware,
    getProfile,
    updateProfile,
    changePassword
} = require('../controllers/accountController');

router.get('/profile', auth, getProfile);
router.put('/profile', auth, (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
        if (err) return res.status(400).json({ msg: err.message });
        next();
    });
}, updateProfile);
router.post('/update-profile', auth, (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
        if (err) return res.status(400).json({ msg: err.message });
        next();
    });
}, updateProfile);
router.post('/change-password', auth, changePassword);

module.exports = router;
