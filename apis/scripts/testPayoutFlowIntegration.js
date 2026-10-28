/**
 * One-off integration smoke test against the REAL database (uses .env
 * MONGO_URI) for the full Kotak payout flow wired into payoutController.
 * Creates a throwaway user + wallet, runs a few scenarios through the real
 * controller function, prints the resulting wallet/payout state, then
 * deletes everything it created. Not a permanent test suite - just a
 * one-time verification script for this integration.
 *
 * Run with: node scripts/testPayoutFlowIntegration.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Payout = require("../models/Payout");
const LedgerTransaction = require("../models/LedgerTransaction");
const payoutController = require("../controllers/payoutController");

const fakeRes = () => {
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
    return res;
};

const fakeIdempotency = () => ({
    complete: async (res, code, body) => res.status(code).json(body),
    fail: async (res, code, body) => res.status(code).json(body),
});

const runOne = async (userId, beneficiary_name, amount) => {
    const req = {
        user: { id: userId },
        idempotency: fakeIdempotency(),
        body: {
            amount,
            beneficiary_name,
            account_number: "1234567890",
            ifsc_code: "KKBK0000958",
            bank_name: "Kotak Mahindra Bank",
        },
    };
    const res = fakeRes();
    await payoutController.createPayout(req, res);
    return res;
};

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected.");

    const user = await User.create({
        first_name: "Test",
        last_name: "KotakIntegration",
        mobile_number: `9${Date.now().toString().slice(-9)}`,
        email: `kotak.integration.${Date.now()}@example.test`,
        password: "not-used",
        role: "user",
    });

    const wallet = await Wallet.create({
        userId: user._id,
        availableBalance: 10000,
        lockedBalance: 0,
    });

    console.log(`Created test user ${user._id}, wallet balance 10000`);

    try {
        console.log("\n=== SUCCESS scenario ===");
        let res = await runOne(user._id, "Ramesh Kumar", 1000);
        console.log("HTTP", res.statusCode, "payout.status =", res.body.payout.status, "wallet =", res.body.wallet);

        console.log("\n=== FAILED scenario ===");
        res = await runOne(user._id, "MOCK_FAIL Beneficiary", 500);
        console.log("HTTP", res.statusCode, "payout.status =", res.body.payout.status, "wallet =", res.body.wallet);

        console.log("\n=== UNKNOWN scenario (funds must stay locked) ===");
        res = await runOne(user._id, "MOCK_TIMEOUT Beneficiary", 250);
        console.log("HTTP", res.statusCode, "payout.status =", res.body.payout.status, "wallet =", res.body.wallet);

        const finalWallet = await Wallet.findOne({ userId: user._id }).lean();
        console.log("\nFinal wallet state:", finalWallet);

        const expectedAvailable = 10000 - 1000 - 250; // 1000 spent (success), 500 released back (failed), 250 still locked (unknown)
        const expectedLocked = 250;
        const ok =
            finalWallet.availableBalance === expectedAvailable &&
            finalWallet.lockedBalance === expectedLocked &&
            finalWallet.totalPayoutSent === 1000 &&
            finalWallet.totalFailed === 500;

        console.log(
            ok
                ? "\nPASS: wallet math matches expected (available=%s locked=%s totalPayoutSent=1000 totalFailed=500)"
                : "\nFAIL: wallet math did NOT match expected",
            expectedAvailable,
            expectedLocked
        );

        const ledgerCount = await LedgerTransaction.countDocuments({ userId: user._id });
        console.log(`Ledger entries created: ${ledgerCount} (expect 3: one PROCESSING->SUCCESS, one PROCESSING->FAILED, one still PROCESSING)`);

    } finally {
        await Payout.deleteMany({ userId: user._id });
        await LedgerTransaction.deleteMany({ userId: user._id });
        await Wallet.deleteMany({ userId: user._id });
        await User.deleteMany({ _id: user._id });
        console.log("\nCleaned up test data.");
        await mongoose.disconnect();
    }
})().catch((err) => {
    console.error("Integration test error:", err);
    process.exit(1);
});
