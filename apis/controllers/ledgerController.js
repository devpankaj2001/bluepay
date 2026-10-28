const mongoose = require("mongoose");
const LedgerTransaction = require("../models/LedgerTransaction");


/**
 * GET WALLET TRANSACTIONS
 *
 * GET:
 * /ledger/transactions
 */
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const {
            type,
            category,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 50,
        } = req.query;

        const filter = {
            userId,
        };

        if (type) {
            filter.type = type.toUpperCase();
        }

        if (category) {
            filter.category =
                category.toUpperCase();
        }

        if (status) {
            filter.status =
                status.toUpperCase();
        }

        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                filter.createdAt.$gte =
                    new Date(startDate);
            }

            if (endDate) {
                const end = new Date(endDate);

                end.setHours(
                    23,
                    59,
                    59,
                    999
                );

                filter.createdAt.$lte = end;
            }
        }

        const pageNumber =
            Math.max(Number(page), 1);

        const pageLimit =
            Math.min(
                Math.max(Number(limit), 1),
                100
            );

        const skip =
            (pageNumber - 1) *
            pageLimit;

        const [
            transactions,
            total,
        ] = await Promise.all([
            LedgerTransaction.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageLimit)
                .lean(),

            LedgerTransaction.countDocuments(
                filter
            ),
        ]);

        return res.json({
            success: true,
            transactions,
            pagination: {
                page: pageNumber,
                limit: pageLimit,
                total,
                totalPages: Math.ceil(
                    total / pageLimit
                ),
            },
        });

    } catch (error) {
        console.error("getTransactions:", error);

        return res.status(500).json({
            msg: "Failed to fetch transactions",
            requestId: req.requestId,
        });
    }
};


/**
 * GET SINGLE TRANSACTION
 */
exports.getTransactionById = async (
    req,
    res
) => {
    try {
        const userId = req.user.id || req.user._id;

        const transaction =
            await LedgerTransaction.findOne({
                _id: req.params.id,
                userId,
            }).lean();

        if (!transaction) {
            return res.status(404).json({
                msg: "Transaction not found",
            });
        }

        return res.json({
            success: true,
            transaction,
        });

    } catch (error) {
        console.error(
            "getTransactionById:",
            error
        );

        return res.status(500).json({
            msg: "Failed to fetch transaction",
            requestId: req.requestId,
        });
    }
};


/**
 * WALLET SUMMARY
 */
exports.getLedgerSummary = async (
    req,
    res
) => {
    try {
        const userId = new mongoose.Types.ObjectId(
            req.user.id || req.user._id
        );

        const result =
            await LedgerTransaction.aggregate([
                {
                    $match: {
                        userId,
                        status: "SUCCESS",
                    },
                },

                {
                    $group: {
                        _id: "$type",

                        total: {
                            $sum: "$amount",
                        },

                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]);

        let credits = {
            total: 0,
            count: 0,
        };

        let debits = {
            total: 0,
            count: 0,
        };

        for (const row of result) {
            if (row._id === "CREDIT") {
                credits = {
                    total: row.total,
                    count: row.count,
                };
            }

            if (row._id === "DEBIT") {
                debits = {
                    total: row.total,
                    count: row.count,
                };
            }
        }

        return res.json({
            success: true,
            credits,
            debits,
        });

    } catch (error) {
        console.error(
            "getLedgerSummary:",
            error
        );

        return res.status(500).json({
            msg: "Failed to fetch ledger summary",
            requestId: req.requestId,
        });
    }
};