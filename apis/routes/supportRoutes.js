const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
    ticketUpload,
    createTicket,
    getMyTickets,
    getTicketById,
    replyToTicket,
    createContactMessage
} = require('../controllers/supportController');

router.post('/create-ticket', auth, (req, res, next) => {
    ticketUpload(req, res, (err) => {
        if (err) return res.status(400).json({ msg: err.message });
        next();
    });
}, createTicket);

router.get('/my-tickets', auth, getMyTickets);
router.get('/ticket/:id', auth, getTicketById);
router.post('/reply/:id', auth, replyToTicket);
router.post('/contact', createContactMessage); // Public endpoint

module.exports = router;
