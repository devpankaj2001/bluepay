const SupportTicket = require('../models/SupportTicket');
const ContactMessage = require('../models/ContactMessage');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/tickets/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `ticket_${Date.now()}${path.extname(file.originalname)}`)
});
exports.ticketUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /pdf|jpeg|jpg|png/;
        if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
        else cb(new Error('Only PDF, JPG, PNG files allowed'));
    }
}).single('attachment');

// POST /api/support/create-ticket
exports.createTicket = async (req, res) => {
    try {
        const { subject, category, description } = req.body;
        const errors = {};
        if (!subject?.trim()) errors.subject = 'Subject is required';
        if (!category) errors.category = 'Category is required';
        if (!description?.trim()) errors.description = 'Description is required';
        if (Object.keys(errors).length) return res.status(422).json({ errors });

        const ticket = await SupportTicket.create({
            userId: req.user.id,
            subject: subject.trim(),
            category,
            description: description.trim(),
            attachment: req.file ? `/${req.file.path}` : '',
        });

        res.status(201).json({ msg: 'Ticket created successfully', ticket });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// GET /api/support/my-tickets
exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

/**
 * `_getTicket`/`_reply` are the ONE implementation of ticket lookup/reply,
 * parameterized by an optional ownership constraint. Merchant routes pass
 * their own id as `ownerUserId` (ownership-checked, unchanged from before);
 * admin routes pass `null` (no ownership constraint - an admin can see and
 * reply to any merchant's ticket) but always tag the reply `senderRole:
 * 'admin'` from the authenticated admin's own id, never a client-supplied one.
 */
const _getTicket = (ticketId, ownerUserId = null) => {
    const query = ownerUserId ? { _id: ticketId, userId: ownerUserId } : { _id: ticketId };
    return SupportTicket.findOne(query).populate('userId', 'first_name last_name email mobile_number company_name accountType');
};

const _reply = async (ticketId, { message, senderId, senderRole }, ownerUserId = null) => {
    if (!message?.trim()) return { statusCode: 422, body: { msg: 'Message is required' } };

    const ticket = await _getTicket(ticketId, ownerUserId);
    if (!ticket) return { statusCode: 404, body: { msg: 'Ticket not found' } };
    if (ticket.status === 'closed') return { statusCode: 400, body: { msg: 'Cannot reply to a closed ticket' } };

    ticket.replies.push({ senderId, senderRole, message: message.trim() });
    if (ticket.status === 'resolved') ticket.status = 'in_progress';
    await ticket.save();

    return { statusCode: 200, body: { msg: 'Reply sent', ticket } };
};

// GET /api/support/ticket/:id (MERCHANT: own ticket only)
exports.getTicketById = async (req, res) => {
    try {
        const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id });
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// POST /api/support/reply/:id (MERCHANT: own ticket only)
exports.replyToTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await _reply(req.params.id, { message: req.body.message, senderId: userId, senderRole: 'user' }, userId);
        return res.status(result.statusCode).json(result.body);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// POST /api/support/contact
exports.createContactMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const errors = {};
        if (!name?.trim()) errors.name = 'Name is required';
        if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email is required';
        if (!message?.trim()) errors.message = 'Message is required';
        if (Object.keys(errors).length) return res.status(422).json({ errors });

        await ContactMessage.create({ name: name.trim(), email: email.toLowerCase(), message: message.trim() });
        res.status(201).json({ msg: 'Message sent! Our team will get back to you shortly.' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// ---------------------------------------------------------------------
// ADMIN: manage any merchant's tickets. All routes are auth + isAdmin
// (see routes/adminSupportRoutes.js) - never ownership-scoped to the
// admin's own id.
// ---------------------------------------------------------------------

// GET /api/admin/support
exports.adminListTickets = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

        const filter = {};
        if (req.query.status && STATUSES.includes(req.query.status)) filter.status = req.query.status;
        if (req.query.priority && PRIORITIES.includes(req.query.priority)) filter.priority = req.query.priority;

        if (req.query.dateFrom || req.query.dateTo) {
            filter.createdAt = {};
            if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) {
                const end = new Date(req.query.dateTo);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const search = String(req.query.search || '').trim().slice(0, 100);
        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const matchingUsers = await User.find({
                role: { $ne: 'superadmin' },
                $or: [{ first_name: regex }, { last_name: regex }, { email: regex }, { mobile_number: regex }, { company_name: regex }],
            }).select('_id').lean();
            filter.$or = [
                { subject: regex },
                { ticketId: regex },
                { userId: { $in: matchingUsers.map((u) => u._id) } },
            ];
        }

        const [tickets, total] = await Promise.all([
            SupportTicket.find(filter)
                .sort({ createdAt: -1 })
                .populate('userId', 'first_name last_name email mobile_number company_name')
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            SupportTicket.countDocuments(filter),
        ]);

        return res.json({ tickets, total, page, limit });
    } catch (error) {
        console.error('adminListTickets:', error.message);
        return res.status(500).json({ msg: 'Failed to load support tickets', requestId: req.requestId });
    }
};

// GET /api/admin/support/:id
exports.adminGetTicket = async (req, res) => {
    try {
        const ticket = await _getTicket(req.params.id);
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
        return res.json({ ticket });
    } catch (error) {
        console.error('adminGetTicket:', error.message);
        return res.status(500).json({ msg: 'Failed to load ticket', requestId: req.requestId });
    }
};

// POST /api/admin/support/:id/reply
exports.adminReplyToTicket = async (req, res) => {
    try {
        const adminId = req.user.id || req.user._id;
        const result = await _reply(req.params.id, { message: req.body.message, senderId: adminId, senderRole: 'admin' });
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('adminReplyToTicket:', error.message);
        return res.status(500).json({ msg: 'Failed to send reply', requestId: req.requestId });
    }
};

// PUT /api/admin/support/:id
exports.adminUpdateTicket = async (req, res) => {
    try {
        const update = {};
        if (req.body.status !== undefined) {
            if (!STATUSES.includes(req.body.status)) return res.status(400).json({ msg: `Status must be one of: ${STATUSES.join(', ')}` });
            update.status = req.body.status;
        }
        if (req.body.priority !== undefined) {
            if (!PRIORITIES.includes(req.body.priority)) return res.status(400).json({ msg: `Priority must be one of: ${PRIORITIES.join(', ')}` });
            update.priority = req.body.priority;
        }
        if (!Object.keys(update).length) return res.status(400).json({ msg: 'Nothing to update' });

        const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });

        return res.json({ msg: 'Ticket updated', ticket });
    } catch (error) {
        console.error('adminUpdateTicket:', error.message);
        return res.status(500).json({ msg: 'Failed to update ticket', requestId: req.requestId });
    }
};

// GET /api/admin/support/:id/attachment
// Streams the ticket's attachment privately instead of relying on the
// public /uploads static path, which is unauthenticated - mirrors the same
// containment check used for KYC documents and fund request receipts.
exports.adminGetAttachment = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id).select('attachment').lean();
        const stored = ticket?.attachment;
        if (!stored) return res.status(404).json({ msg: 'Attachment not found' });

        const relative = stored.replace(/^\/+/, '');
        const resolved = path.resolve(relative);
        const uploadsRoot = path.resolve('uploads');
        if (!resolved.startsWith(`${uploadsRoot}${path.sep}`) || !fs.existsSync(resolved)) {
            return res.status(404).json({ msg: 'Attachment not found' });
        }

        return res.sendFile(resolved);
    } catch (error) {
        console.error('adminGetAttachment:', error.message);
        return res.status(500).json({ msg: 'Failed to load attachment', requestId: req.requestId });
    }
};
