const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware'); // auth is the middleware itself (default export)
const { isAdmin } = require('../middleware/authMiddleware'); // isAdmin is a named export property

// @route   GET api/users
// @desc    Get all users (Admin)
// @access  Private/Admin
router.get('/', auth, isAdmin, userController.getAllUsers);

// @route   PUT api/users/:id/status
// @desc    Update user status (Admin)
// @access  Private/Admin
router.put('/:id/status', auth, isAdmin, userController.updateUserStatus);

// @route   POST api/users
// @desc    Create a new user (Admin)
router.post('/', auth, isAdmin, userController.createUser);

// @route   GET api/users/dashboard
// @desc    Get dashboard info for logged in user
router.get('/dashboard', auth, userController.getUserDashboardInfo);

// @route   GET api/users/:id/dashboard
// @desc    Get dashboard info for a specific user (Admin)
router.get('/:id/dashboard', auth, isAdmin, userController.getUserDashboardInfo);

// @route   PUT api/users/:id/wallet
// @desc    Update a user's wallet info (Admin)
router.put('/:id/wallet', auth, isAdmin, userController.updateUserWallet);

module.exports = router;
