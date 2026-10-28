const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { check } = require('express-validator'); // Optional validation
const { authLimiter } = require('../config/security');
const { validateLogin } = require('../middleware/inputValidation');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authLimiter, authController.register);

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, validateLogin, authController.login);

// @route   POST api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post('/verify-otp', authLimiter, authController.verifyOtp);

// @route   POST api/auth/resend-otp
// @desc    Resend OTP
// @access  Public
router.post('/resend-otp', authLimiter, authController.resendOtp);

module.exports = router;
