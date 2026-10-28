const express = require('express');
const router = express.Router();

const developerController = require('../controllers/developerController');
const auth = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const requireManagedMerchant = require('../middleware/requireManagedMerchant');
const { credentialLimiter } = require('../config/security');

router.get('/:userId/credentials', auth, isAdmin, credentialLimiter, requireManagedMerchant, developerController.adminListCredentials);
router.post('/:userId/credentials/:environment/rotate', auth, isAdmin, credentialLimiter, requireManagedMerchant, developerController.adminRotateCredential);
router.post('/:userId/credentials/:environment/revoke', auth, isAdmin, credentialLimiter, requireManagedMerchant, developerController.adminRevokeCredential);

module.exports = router;
