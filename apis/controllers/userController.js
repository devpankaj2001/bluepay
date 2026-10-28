const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const bcrypt = require('bcryptjs');
const { adjustWallet } = require('../utils/ledger');
const logger = require('../utils/logger');
const { maskPayout } = require('../utils/mask');

// Get all users (Admin only). Supports optional search/filter/pagination
// query params so the admin Users page never has to pull the whole
// collection into the browser just to filter it client-side.
exports.getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

        const match = { role: { $ne: 'superadmin' } };

        const search = String(req.query.search || '').trim().slice(0, 100);
        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [
                { first_name: regex },
                { last_name: regex },
                { email: regex },
                { mobile_number: regex },
                { company_name: regex },
            ];
        }

        if (req.query.kycStatus && ['pending', 'verified', 'rejected', 'unverified'].includes(req.query.kycStatus)) {
            match.kycStatus = req.query.kycStatus;
        }

        if (req.query.status !== undefined && ['0', '1'].includes(String(req.query.status))) {
            match.status = Number(req.query.status);
        }

        if (req.query.accountType && ['individual', 'corporate'].includes(req.query.accountType)) {
            match.accountType = req.query.accountType;
        }

        if (req.query.dateFrom || req.query.dateTo) {
            match.createdAt = {};
            if (req.query.dateFrom) match.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) {
                const end = new Date(req.query.dateTo);
                end.setHours(23, 59, 59, 999);
                match.createdAt.$lte = end;
            }
        }

        const [users, total] = await Promise.all([
            User.find(match)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            User.countDocuments(match),
        ]);

        res.json({ users, total, page, limit });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update user status (Admin only)
exports.updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { status, kycStatus, accountType, domain } = req.body;
    try {
        let user = await User.findById(id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (status !== undefined) user.status = status;
        if (kycStatus !== undefined) user.kycStatus = kycStatus;
        if (accountType !== undefined) user.accountType = accountType;
        if (domain !== undefined) user.domain = domain;
        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.createUser = async (req, res) => {
    const { first_name, last_name, email, mobile_number, password, kycStatus, accountType, domain, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Email already exists' });
        user = await User.findOne({ mobile_number });
        if (user) return res.status(400).json({ msg: 'Mobile number already exists' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({
            first_name, last_name, email, mobile_number, password: hashedPassword,
            kycStatus: kycStatus || 'unverified',
            accountType: accountType || 'corporate',
            domain: domain || '',
            role: role || 'user',
            isVerified: true
        });
        await user.save();
        const wallet = new Wallet({ userId: user._id });
        await wallet.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get Data for User Dashboard — FULLY DYNAMIC
exports.getUserDashboardInfo = async (req, res) => {
    const userId = req.params.id || req.user.id;
    try {
        const FundRequest = require('../models/FundRequest');
        const Payout = require('../models/Payout');

        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId });
            await wallet.save();
        }

        // Month range
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Fund requests
        const allFundRequests = await FundRequest.find({ userId }).sort({ createdAt: -1 });
        const pendingFundRequests = allFundRequests.filter(f => f.status === 'pending');
        const pendingAmount = pendingFundRequests.reduce((s, f) => s + f.amount, 0);
        const monthCredits = allFundRequests
            .filter(f => f.status === 'approved' && new Date(f.createdAt) >= monthStart && new Date(f.createdAt) <= monthEnd)
            .reduce((s, f) => s + f.amount, 0);
        const lastCreditReq = allFundRequests.find(f => f.status === 'approved');

        // Payouts
        const allPayouts = await Payout.find({ userId }).sort({ createdAt: -1 });
        const lastDebit = allPayouts.find(p => p.status === 'success');
        const monthDebits = allPayouts
            .filter(p => p.status === 'success' && new Date(p.createdAt) >= monthStart && new Date(p.createdAt) <= monthEnd)
            .reduce((s, p) => s + p.amount, 0);
        const monthFailed = allPayouts.filter(p => p.status === 'failed' && new Date(p.createdAt) >= monthStart && new Date(p.createdAt) <= monthEnd).length;
        const monthSuccess = allPayouts.filter(p => p.status === 'success' && new Date(p.createdAt) >= monthStart && new Date(p.createdAt) <= monthEnd).length;
        const monthTotal = allPayouts.filter(p => new Date(p.createdAt) >= monthStart && new Date(p.createdAt) <= monthEnd).length;

        // Recent payouts (last 5 for table)
        const recentPayouts = allPayouts.slice(0, 5);

        // Success rate lifetime
        const successPayouts = allPayouts.filter(p => p.status === 'success').length;
        const successRate = allPayouts.length > 0 ? Math.round((successPayouts / allPayouts.length) * 100) : 0;

        // Weekly chart data (last 7 days)
        const weeklyData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            const dayPayouts = allPayouts.filter(p => new Date(p.createdAt) >= dayStart && new Date(p.createdAt) <= dayEnd);
            const dayAmount = dayPayouts.filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0);
            weeklyData.push({
                name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
                amount: dayAmount,
                count: dayPayouts.length
            });
        }

        res.json({
            user,
            wallet: { ...wallet.toObject(), successRate },
            walletSummary: {
                lastCredit: lastCreditReq ? { amount: lastCreditReq.amount, method: 'Bank Transfer', date: lastCreditReq.updatedAt } : null,
                lastDebit: lastDebit ? { amount: lastDebit.amount, payoutId: lastDebit._id.toString().slice(-6).toUpperCase(), date: lastDebit.updatedAt } : null,
                pendingRequestsCount: pendingFundRequests.length,
                pendingRequestsAmount: pendingAmount,
                monthCredits,
                monthDebits,
                monthSuccess,
                monthFailed,
                monthTotal,
            },
            recentPayouts: recentPayouts.map(maskPayout),
            weeklyData,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Admin-only manual wallet override (used by the admin Users page's wallet
// editor). Any change to availableBalance is routed through adjustWallet()
// so it leaves a ledger ADJUSTMENT entry instead of silently overwriting
// the balance with no audit trail - the rest of the app's reconciliation
// math (ledger credits/debits vs current balance) would otherwise no
// longer add up after this endpoint was used.
exports.updateUserWallet = async (req, res) => {
    const userId = req.params.id;
    const { availableBalance, lockedBalance, totalPayoutSent, totalFailed, todayApiRequests, successRate } = req.body;

    const numericFields = { availableBalance, lockedBalance, totalPayoutSent, totalFailed, todayApiRequests, successRate };
    for (const [key, value] of Object.entries(numericFields)) {
        if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
            return res.status(400).json({ msg: `${key} must be a non-negative number` });
        }
    }

    const session = await mongoose.startSession();

    try {
        let wallet;

        await session.withTransaction(async () => {
            wallet = await Wallet.findOne({ userId }).session(session);
            if (!wallet) {
                const created = await Wallet.create([{ userId }], { session });
                wallet = created[0];
            }

            if (availableBalance !== undefined) {
                const delta = Number(availableBalance) - wallet.availableBalance;

                if (delta !== 0) {
                    const result = await adjustWallet({
                        userId,
                        amount: Math.abs(delta),
                        type: delta > 0 ? "CREDIT" : "DEBIT",
                        description: "Manual wallet balance override by admin",
                        createdBy: req.user.id || req.user._id,
                        metadata: { adminOverride: true, requestedValue: Number(availableBalance) },
                        session,
                    });
                    wallet = result.wallet;
                }
            }

            const directFields = { lockedBalance, totalPayoutSent, totalFailed, todayApiRequests, successRate };
            let directFieldsChanged = false;

            for (const [key, value] of Object.entries(directFields)) {
                if (value !== undefined && wallet[key] !== Number(value)) {
                    wallet[key] = Number(value);
                    directFieldsChanged = true;
                }
            }

            if (directFieldsChanged) {
                await wallet.save({ session });
            }

            logger.info("wallet.manualOverride", {
                userId: userId.toString(),
                adminId: (req.user.id || req.user._id).toString(),
                fieldsChanged: Object.keys(numericFields).filter((k) => numericFields[k] !== undefined),
            });
        });

        return res.json(wallet);
    } catch (err) {
        console.error("updateUserWallet:", err.message);
        return res.status(400).json({ msg: err.message || "Failed to update wallet" });
    } finally {
        await session.endSession();
    }
};
