const express = require('express');
const router = express.Router();

const supportController = require('../controllers/supportController');
const auth = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

router.get('/', auth, isAdmin, supportController.adminListTickets);
router.get('/:id', auth, isAdmin, supportController.adminGetTicket);
router.get('/:id/attachment', auth, isAdmin, supportController.adminGetAttachment);
router.post('/:id/reply', auth, isAdmin, supportController.adminReplyToTicket);
router.put('/:id', auth, isAdmin, supportController.adminUpdateTicket);

module.exports = router;
