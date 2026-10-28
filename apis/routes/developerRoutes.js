const express = require('express');
const auth = require('../middleware/authMiddleware');
const developerController = require('../controllers/developerController');
const { credentialLimiter } = require('../config/security');

const router = express.Router();

router.get('/credentials', auth, credentialLimiter, developerController.listCredentials);
router.post('/credentials/:environment/rotate', auth, credentialLimiter, developerController.rotateCredential);
router.post('/credentials/:environment/revoke', auth, credentialLimiter, developerController.revokeCredential);

module.exports = router;