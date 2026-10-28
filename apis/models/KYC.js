const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    kycType: { type: String, enum: ['individual', 'business'], default: 'individual' },
    pan_number: { type: String, default: '' },
    aadhaar_number: { type: String, default: '' },
    gst_number: { type: String, default: '' },
    pan_encrypted: { type: String, default: '', select: false },
    aadhaar_encrypted: { type: String, default: '', select: false },
    gst_encrypted: { type: String, default: '', select: false },
    pan_file: { type: String, default: '' },
    aadhaar_file: { type: String, default: '' },
    selfie_file: { type: String, default: '' },
    gst_file: { type: String, default: '' },
    company_doc_file: { type: String, default: '' },
    status: { type: String, enum: ['not_submitted', 'pending', 'approved', 'rejected'], default: 'not_submitted' },
    rejection_reason: { type: String, default: '' },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('KYC', kycSchema);
