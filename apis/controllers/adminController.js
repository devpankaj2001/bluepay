const User = require('../models/User');
const Payout = require('../models/Payout');
const FundRequest = require('../models/FundRequest');
const Wallet = require('../models/Wallet');
const KYC = require('../models/KYC');

exports.getDashboardStats = async (req, res) => {
    try {
        const [
            userCount,
            activeUserCount,
            payoutCount,
            payoutTotals,
            failedPayoutCount,
            pendingFunds,
            approvedFundTotals,
            walletTotals,
            pendingKycCount,
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'superadmin' } }),
            User.countDocuments({ role: { $ne: 'superadmin' }, status: 1 }),
            Payout.countDocuments(),
            Payout.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),
            Payout.countDocuments({ status: 'failed' }),
            FundRequest.countDocuments({ status: 'pending' }),
            FundRequest.aggregate([
                { $match: { status: 'approved' } },
                { $group: { _id: null, amount: { $sum: '$amount' } } },
            ]),
            Wallet.aggregate([
                { $group: { _id: null, availableBalance: { $sum: '$availableBalance' }, lockedBalance: { $sum: '$lockedBalance' } } },
            ]),
            KYC.countDocuments({ status: 'pending' }),
        ]);

        return res.json({
            success: true,
            stats: {
                users: userCount,
                activeUsers: activeUserCount,
                payouts: payoutCount,
                successfulPayouts: payoutTotals[0]?.count || 0,
                successfulPayoutAmount: payoutTotals[0]?.amount || 0,
                failedPayouts: failedPayoutCount,
                pendingFundRequests: pendingFunds,
                totalFundedAmount: approvedFundTotals[0]?.amount || 0,
                availableBalance: walletTotals[0]?.availableBalance || 0,
                lockedBalance: walletTotals[0]?.lockedBalance || 0,
                pendingKyc: pendingKycCount,
            },
        });
    } catch (error) {
        console.error('getDashboardStats:', error.message);
        return res.status(500).json({ msg: 'Failed to load dashboard statistics', requestId: req.requestId });
    }
};