const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const FundRequest = require("../models/FundRequest");
const Wallet = require("../models/Wallet");
const LedgerTransaction = require("../models/LedgerTransaction");
const User = require("../models/User");

const {
    creditWallet,
} = require("../utils/ledger");
const { maskPayout } = require("../utils/mask");
const { logActivity } = require("../utils/activityLogger");


/**
 * CREATE FUND REQUEST
 *
 * Merchant submits UTR/payment proof.
 * Wallet is NOT credited here.
 */
exports.createFundRequest = async (req, res) => {
    // Set by middleware/idempotencyMiddleware.js (requestType: 'FUNDING').
    const { idempotency } = req;

    try {
        const userId = req.user.id || req.user._id;

        const amount = Number(req.body.amount);
        const utrNumber = String(
            req.body.utr_number || ""
        ).trim();

        const remarks = String(
            req.body.remarks || ""
        ).trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            return idempotency.fail(res, 400, {
                msg: "Invalid amount",
            });
        }

        if (!utrNumber) {
            return idempotency.fail(res, 400, {
                msg: "UTR number is required",
            });
        }

        // Prevent same UTR from being submitted twice
        const existingUTR = await FundRequest.findOne({
            utr_number: utrNumber,
        });

        if (existingUTR) {
            return idempotency.fail(res, 409, {
                msg: "This UTR has already been submitted",
            });
        }

        const receipt =
            req.file?.path ||
            req.file?.filename ||
            null;

        const request = await FundRequest.create({
            userId,
            amount,
            UTR: utrNumber,
            utr_number: utrNumber,
            receipt_image: receipt || '',
            remarks,
            status: "pending",
        });

        logActivity({
            userId,
            type: "USER_ACTIVITY",
            action: "FUND_REQUEST_CREATED",
            description: `Fund request submitted for ₹${amount}`,
            resourceType: "FUND_REQUEST",
            resourceId: request._id,
            req,
        });

        return idempotency.complete(
            res,
            201,
            {
                success: true,
                msg: "Fund request submitted successfully",
                fundRequest: request,
            },
            request._id.toString()
        );

    } catch (error) {
        console.error("createFundRequest:", error.message);

        if (idempotency) {
            return idempotency.fail(res, 500, {
                msg: "Failed to create fund request",
            });
        }

        return res.status(500).json({
            msg: "Failed to create fund request",
            requestId: req.requestId,
        });
    }
};


/**
 * ADMIN APPROVE FUND REQUEST
 *
 * IMPORTANT:
 * This is the point where wallet gets credited.
 */
exports.approveFundRequest = async (req, res) => {
    try {
        const requestId =
            req.params.id ||
            req.params.requestId;

        const adminId =
            req.user.id ||
            req.user._id;

        const requestBefore = await FundRequest.findById(requestId);

        if (!requestBefore) {
            return res.status(404).json({
                msg: "Fund request not found",
            });
        }

        if (requestBefore.status !== "pending") {
            return res.status(400).json({
                msg: `Fund request is already ${requestBefore.status}`,
            });
        }

        // Atomic claim (compare-and-swap on status) + wallet credit happen
        // in ONE transaction. Two concurrent approve calls (double-click,
        // or a retried request) can both pass the read above, but only ONE
        // findOneAndUpdate below can actually flip pending -> approved -
        // that is what makes "credit exactly once" true under a race,
        // not the earlier status check.
        const session = await mongoose.startSession();
        let claimed = null;
        let wallet = null;
        let ledger = null;

        try {
            await session.withTransaction(async () => {
                claimed = await FundRequest.findOneAndUpdate(
                    { _id: requestId, status: "pending" },
                    {
                        $set: {
                            status: "approved",
                            adminRemarks: req.body.adminRemarks || "Fund request approved",
                        },
                    },
                    { new: true, session }
                );

                if (!claimed) {
                    return; // lost the race - another request already claimed it
                }

                const result = await creditWallet({
                    userId: claimed.userId,
                    amount: claimed.amount,
                    category: "FUNDING",
                    referenceId: claimed._id.toString(),
                    referenceType: "FundRequest",
                    description: `Wallet funding approved - UTR ${claimed.utr_number}`,
                    createdBy: adminId,
                    metadata: {
                        utr: claimed.utr_number,
                        remarks: claimed.remarks,
                    },
                    session,
                });

                wallet = result.wallet;
                ledger = result.ledger;
            });
        } finally {
            await session.endSession();
        }

        if (!claimed) {
            return res.status(409).json({
                msg: "This fund request was already processed",
            });
        }

        return res.json({
            success: true,
            msg: "Fund request approved and wallet credited",
            wallet,
            ledger,
            fundRequest: claimed,
        });

    } catch (error) {
        console.error("approveFundRequest:", error);

        return res.status(500).json({
            msg: "Failed to approve fund request",
            requestId: req.requestId,
        });
    }
};


/**
 * ADMIN REJECT FUND REQUEST
 */
exports.rejectFundRequest = async (req, res) => {
    try {
        const requestId =
            req.params.id ||
            req.params.requestId;

        const request =
            await FundRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({
                msg: "Fund request not found",
            });
        }

        if (request.status !== "pending") {
            return res.status(400).json({
                msg: `Fund request is already ${request.status}`,
            });
        }

        const adminRemarks = String(req.body.adminRemarks || "").trim();

        if (!adminRemarks) {
            return res.status(422).json({
                msg: "Admin remarks are required to reject a fund request",
            });
        }

        request.status = "rejected";
        request.adminRemarks = adminRemarks.slice(0, 500);

        await request.save();

        return res.json({
            success: true,
            msg: "Fund request rejected",
            fundRequest: request,
        });

    } catch (error) {
        console.error("rejectFundRequest:", error);

        return res.status(500).json({
            msg: "Failed to reject fund request",
            requestId: req.requestId,
        });
    }
};


/**
 * ADMIN: LIST ALL FUND REQUESTS
 *
 * Supports optional search/filter/pagination query params so the admin
 * page never has to pull the whole collection into the browser.
 */
exports.getAllFundRequests = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

        const filter = {};

        if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) {
            filter.status = req.query.status;
        }

        if (req.query.utr) {
            const utrRegex = new RegExp(String(req.query.utr).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.utr_number = utrRegex;
        }

        if (req.query.dateFrom || req.query.dateTo) {
            filter.createdAt = {};
            if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) {
                const end = new Date(req.query.dateTo);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        // Merchant name/email search lives on User, not FundRequest, so
        // resolve matching user ids first.
        const search = String(req.query.search || "").trim().slice(0, 100);
        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            const matchingUsers = await User.find({
                role: { $ne: "superadmin" },
                $or: [
                    { first_name: regex },
                    { last_name: regex },
                    { email: regex },
                    { mobile_number: regex },
                    { company_name: regex },
                ],
            }).select("_id").lean();
            filter.userId = { $in: matchingUsers.map((user) => user._id) };
        }

        const [requests, total] = await Promise.all([
            FundRequest.find(filter)
                .sort({ createdAt: -1 })
                .populate("userId", "first_name last_name email mobile_number company_name")
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            FundRequest.countDocuments(filter),
        ]);

        return res.json({ requests, total, page, limit });
    } catch (error) {
        console.error("getAllFundRequests:", error);

        return res.status(500).json({
            msg: "Failed to load fund requests",
            requestId: req.requestId,
        });
    }
};


/**
 * ADMIN: SECURELY STREAM A FUND REQUEST'S RECEIPT/PROOF IMAGE
 *
 * Mirrors adminKycController.getDocument's containment check so a
 * receipt can never be read from outside uploads/, and is never served
 * through a public, unauthenticated URL - only via this isAdmin route.
 */
exports.getReceipt = async (req, res) => {
    try {
        const request = await FundRequest.findById(req.params.id).select("receipt_image").lean();
        const storedPath = request?.receipt_image;
        if (!storedPath) return res.status(404).json({ msg: "Receipt not found" });

        const resolved = path.resolve(storedPath);
        const uploadsRoot = path.resolve("uploads");
        if (!resolved.startsWith(`${uploadsRoot}${path.sep}`) || !fs.existsSync(resolved)) {
            return res.status(404).json({ msg: "Receipt not found" });
        }

        return res.sendFile(resolved);
    } catch (error) {
        console.error("getReceipt:", error);
        return res.status(500).json({ msg: "Failed to load receipt", requestId: req.requestId });
    }
};


/**
 * MERCHANT: LIST OWN FUND REQUESTS
 */
exports.getUserFundRequests = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const requests = await FundRequest.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        return res.json(requests);
    } catch (error) {
        console.error("getUserFundRequests:", error);

        return res.status(500).json({
            msg: "Failed to load fund requests",
            requestId: req.requestId,
        });
    }
};


/**
 * ADMIN: APPROVE/REJECT FUND REQUEST
 *
 * Existing frontend sends { status: 'approved' | 'rejected', adminRemarks }
 * via PUT /funds/:id/status - delegates to the existing approve/reject logic
 * so the actual wallet-credit rules only live in one place.
 */
exports.updateFundRequestStatus = async (req, res) => {
    const { status } = req.body;

    if (status === "approved") {
        return exports.approveFundRequest(req, res);
    }

    if (status === "rejected") {
        return exports.rejectFundRequest(req, res);
    }

    return res.status(400).json({
        msg: "Invalid status. Must be 'approved' or 'rejected'",
    });
};


/**
 * WALLET OVERVIEW
 *
 * Existing frontend uses:
 * /funds/wallet-overview
 */
exports.walletOverview = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : null;

        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : null;

        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        }

        const dateFilter = {};

        if (startDate || endDate) {
            dateFilter.createdAt = {};

            if (startDate) {
                dateFilter.createdAt.$gte = startDate;
            }

            if (endDate) {
                dateFilter.createdAt.$lte = endDate;
            }
        }

        const wallet =
            await Wallet.findOne({ userId })
                .lean();

        const ledgerQuery = {
            userId,
            ...dateFilter,
        };

        const transactions =
            await LedgerTransaction.find(
                ledgerQuery
            )
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

        const creditResult =
            await LedgerTransaction.aggregate([
                {
                    $match: {
                        userId:
                            require("mongoose").Types.ObjectId.createFromHexString(
                                userId.toString()
                            ),
                        type: "CREDIT",
                        status: "SUCCESS",
                        ...dateFilter,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                    },
                },
            ]);

        const debitResult =
            await LedgerTransaction.aggregate([
                {
                    $match: {
                        userId:
                            require("mongoose").Types.ObjectId.createFromHexString(
                                userId.toString()
                            ),
                        type: "DEBIT",
                        status: "SUCCESS",
                        ...dateFilter,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                    },
                },
            ]);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayFilter = {
            userId,
            createdAt: {
                $gte: todayStart,
                $lte: todayEnd,
            },
            status: "SUCCESS",
        };

        const todayCredits =
            await LedgerTransaction.aggregate([
                {
                    $match: {
                        ...todayFilter,
                        type: "CREDIT",
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                    },
                },
            ]);

        const todayDebits =
            await LedgerTransaction.aggregate([
                {
                    $match: {
                        ...todayFilter,
                        type: "DEBIT",
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                    },
                },
            ]);

        const pendingFunds =
            await FundRequest.countDocuments({
                userId,
                status: "pending",
            });

        const [
            fundRequests,
            payouts,
        ] = await Promise.all([
            FundRequest.find({
                userId,
                ...(dateFilter.createdAt
                    ? dateFilter
                    : {}),
            })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),

            require("../models/Payout")
                .find({
                    userId,
                    ...(dateFilter.createdAt
                        ? dateFilter
                        : {}),
                })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),
        ]);

        return res.json({
            success: true,

            wallet: wallet || {
                availableBalance: 0,
                lockedBalance: 0,
                totalPayoutSent: 0,
                totalFailed: 0,
            },

            metrics: {
                totalCredit:
                    creditResult[0]?.total || 0,

                totalDebit:
                    debitResult[0]?.total || 0,

                todayCredit:
                    todayCredits[0]?.total || 0,

                todayDebit:
                    todayDebits[0]?.total || 0,

                pendingFunds,
            },

            transactions,

            fundRequests,

            payouts: payouts.map(maskPayout),
        });

    } catch (error) {
        console.error("walletOverview:", error);

        return res.status(500).json({
            msg: "Failed to load wallet overview",
            requestId: req.requestId,
        });
    }
};