const mongoose = require('mongoose');

const fundRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    utr_number: { type: String, required: true },
    receipt_image: { type: String, default: '' },
    remarks: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminRemarks: { type: String, default: '' } // When admin rejects or approves
}, { timestamps: true });

const FundRequest = mongoose.model('FundRequest', fundRequestSchema);
module.exports = FundRequest;
