const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: String, unique: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Payment Issue', 'Payout Issue', 'API Issue', 'KYC Issue', 'Other'], required: true },
    description: { type: String, required: true },
    attachment: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    replies: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        senderRole: { type: String, enum: ['user', 'admin'] },
        message: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
}, { timestamps: true });

// Auto-generate ticket ID before save
ticketSchema.pre('save', async function (next) {
    if (!this.ticketId) {
        const count = await mongoose.model('SupportTicket').countDocuments();
        this.ticketId = `BP-TKT-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('SupportTicket', ticketSchema);
