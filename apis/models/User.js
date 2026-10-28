const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        required: true,
        trim: true
    },
    mobile_number: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'agent', 'superadmin'],
        default: 'user'
    },
    status: {
        type: Number,
        enum: [0, 1],
        default: 1
    },
    profile_image: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    kycStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'unverified'],
        default: 'unverified'
    },
    accountType: {
        type: String,
        enum: ['individual', 'corporate'],
        default: 'corporate'
    },
    company_name: {
        type: String,
        default: ''
    },
    domain: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
