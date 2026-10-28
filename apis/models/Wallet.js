const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    lockedBalance: {
        type: Number,
        default: 0
    },
    totalPayoutSent: {
        type: Number,
        default: 0
    },
    totalFailed: {
        type: Number,
        default: 0
    },
    todayApiRequests: {
        type: Number,
        default: 0
    },
    successRate: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
