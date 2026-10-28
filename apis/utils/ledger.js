const mongoose = require("mongoose");
const crypto = require("crypto");

const Wallet = require("../models/Wallet");
const LedgerTransaction = require("../models/LedgerTransaction");

const generateTransactionId = (prefix = "TXN") => {
    return `${prefix}_${Date.now()}_${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;
};

/**
 * CREDIT MONEY INTO AVAILABLE WALLET
 *
 * Example:
 * Merchant deposits ₹50,000
 *
 * availableBalance:
 * 10,000 → 60,000
 */
const creditWallet = async ({
    userId,
    amount,
    category = "FUNDING",
    referenceId = null,
    referenceType = null,
    description = "",
    createdBy = null,
    metadata = {},
    session = null,
}) => {
    if (!userId) {
        throw new Error("userId is required");
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Invalid credit amount");
    }

    const walletQuery = Wallet.findOneAndUpdate(
        { userId },
        {
            $inc: {
                availableBalance: Number(amount),
            },
        },
        {
            new: true,
            upsert: true,
        }
    );

    if (session) {
        walletQuery.session(session);
    }

    const wallet = await walletQuery;

    const transactionId = generateTransactionId("CR");

    const ledgerQuery = LedgerTransaction.create(
        [
            {
                userId,
                transactionId,
                type: "CREDIT",
                category,
                amount: Number(amount),
                balanceAfter: Number(wallet.availableBalance),
                status: "SUCCESS",
                referenceId,
                referenceType,
                description,
                createdBy,
                metadata,
            },
        ],
        session ? { session } : undefined
    );

    const [ledger] = await ledgerQuery;

    return {
        wallet,
        ledger,
    };
};


/**
 * RESERVE MONEY FOR PAYOUT
 *
 * available → locked
 *
 * Example:
 *
 * Available = ₹90,000
 * Payout = ₹10,000
 *
 * Available = ₹80,000
 * Locked    = ₹10,000
 */
const reserveForPayout = async ({
    userId,
    amount,
    payoutId = null,
    createdBy = null,
    metadata = {},
    session = null,
}) => {
    if (!userId) {
        throw new Error("userId is required");
    }

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid payout amount");
    }

    const walletQuery = Wallet.findOneAndUpdate(
        {
            userId,
            availableBalance: { $gte: amount },
        },
        {
            $inc: {
                availableBalance: -amount,
                lockedBalance: amount,
            },
        },
        {
            new: true,
        }
    );

    if (session) {
        walletQuery.session(session);
    }

    const wallet = await walletQuery;

    if (!wallet) {
        throw new Error("Insufficient wallet balance");
    }

    const transactionId = generateTransactionId("DR");

    const ledgerQuery = LedgerTransaction.create(
        [
            {
                userId,
                transactionId,
                type: "DEBIT",
                category: "PAYOUT",
                amount,
                balanceAfter: Number(wallet.availableBalance),
                status: "PROCESSING",
                referenceId: payoutId,
                referenceType: "Payout",
                description: "Payout amount reserved",
                createdBy,
                metadata,
            },
        ],
        session ? { session } : undefined
    );

    const [ledger] = await ledgerQuery;

    return {
        wallet,
        ledger,
    };
};


/**
 * PAYOUT SUCCESS
 *
 * locked balance is released.
 *
 * Available remains unchanged.
 * Locked decreases.
 */
const completePayout = async ({
    userId,
    amount,
    payoutId,
    session = null,
}) => {
    amount = Number(amount);

    const walletQuery = Wallet.findOneAndUpdate(
        {
            userId,
            lockedBalance: { $gte: amount },
        },
        {
            $inc: {
                lockedBalance: -amount,
                totalPayoutSent: amount,
            },
        },
        {
            new: true,
        }
    );

    if (session) {
        walletQuery.session(session);
    }

    const wallet = await walletQuery;

    if (!wallet) {
        throw new Error("Unable to complete payout wallet update");
    }

    await LedgerTransaction.updateOne(
        {
            userId,
            referenceId: payoutId,
            category: "PAYOUT",
            status: "PROCESSING",
        },
        {
            $set: {
                status: "SUCCESS",
                balanceAfter: Number(wallet.availableBalance),
            },
        },
        session ? { session } : undefined
    );

    return wallet;
};


/**
 * PAYOUT FAILED
 *
 * locked → available
 *
 * Example:
 *
 * Available = ₹80,000
 * Locked    = ₹10,000
 *
 * payout failed
 *
 * Available = ₹90,000
 * Locked    = ₹0
 */
const failPayout = async ({
    userId,
    amount,
    payoutId,
    reason = "",
    session = null,
}) => {
    amount = Number(amount);

    const walletQuery = Wallet.findOneAndUpdate(
        {
            userId,
            lockedBalance: { $gte: amount },
        },
        {
            $inc: {
                lockedBalance: -amount,
                availableBalance: amount,
                totalFailed: amount,
            },
        },
        {
            new: true,
        }
    );

    if (session) {
        walletQuery.session(session);
    }

    const wallet = await walletQuery;

    if (!wallet) {
        throw new Error("Unable to release payout balance");
    }

    await LedgerTransaction.updateOne(
        {
            userId,
            referenceId: payoutId,
            category: "PAYOUT",
            status: "PROCESSING",
        },
        {
            $set: {
                status: "FAILED",
                balanceAfter: Number(wallet.availableBalance),
                description: reason || "Payout failed",
            },
        },
        session ? { session } : undefined
    );

    return wallet;
};


/**
 * ADMIN ADJUSTMENT
 *
 * Use carefully.
 * Every manual adjustment gets its own ledger entry.
 */
const adjustWallet = async ({
    userId,
    amount,
    type,
    description,
    createdBy,
    metadata = {},
    session = null,
}) => {
    amount = Number(amount);

    if (!["CREDIT", "DEBIT"].includes(type)) {
        throw new Error("Adjustment type must be CREDIT or DEBIT");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid adjustment amount");
    }

    const inc = type === "CREDIT" ? amount : -amount;

    const walletQuery = Wallet.findOneAndUpdate(
        {
            userId,
            ...(type === "DEBIT"
                ? { availableBalance: { $gte: amount } }
                : {}),
        },
        {
            $inc: {
                availableBalance: inc,
            },
        },
        {
            new: true,
        }
    );

    if (session) {
        walletQuery.session(session);
    }

    const wallet = await walletQuery;

    if (!wallet) {
        throw new Error(
            type === "DEBIT"
                ? "Insufficient wallet balance"
                : "Wallet not found"
        );
    }

    const transactionId = generateTransactionId(
        type === "CREDIT" ? "ADJCR" : "ADJDR"
    );

    const [ledger] = await LedgerTransaction.create(
        [
            {
                userId,
                transactionId,
                type,
                category: "ADJUSTMENT",
                amount,
                balanceAfter: Number(wallet.availableBalance),
                status: "SUCCESS",
                referenceType: "Manual",
                description,
                createdBy,
                metadata,
            },
        ],
        session ? { session } : undefined
    );

    return {
        wallet,
        ledger,
    };
};


module.exports = {
    generateTransactionId,
    creditWallet,
    reserveForPayout,
    completePayout,
    failPayout,
    adjustWallet,
};