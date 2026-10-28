/**
 * One-off verification against the REAL database for:
 *   - concurrent payout reservation race-safety (two simultaneous ₹8,000
 *     payouts against a ₹10,000 wallet - only one may reserve)
 *   - idempotency: the same Idempotency-Key submitted twice concurrently
 *     for payout creation must only create ONE payout / reserve funds once
 *
 * Run with: node scripts/testConcurrencyAndIdempotency.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Payout = require("../models/Payout");
const LedgerTransaction = require("../models/LedgerTransaction");
const IdempotencyKey = require("../models/IdempotencyKey");
const idempotencyMiddleware = require("../middleware/idempotencyMiddleware");
const payoutController = require("../controllers/payoutController");

const fakeRes = () => {
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
    return res;
};

const runMiddlewareThenController = (req) =>
    new Promise((resolve) => {
        const res = fakeRes();
        idempotencyMiddleware("PAYOUT")(req, res, async () => {
            await payoutController.createPayout(req, res);
            resolve(res);
        });
        // If the middleware itself short-circuits (e.g. 409 duplicate),
        // `next` is never called - resolve from res once it's written.
        const check = setInterval(() => {
            if (res.statusCode !== null) {
                clearInterval(check);
                resolve(res);
            }
        }, 10);
    });

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected.\n");

    const user = await User.create({
        first_name: "Test",
        last_name: "ConcurrencyCheck",
        mobile_number: `9${Date.now().toString().slice(-9)}`,
        email: `concurrency.check.${Date.now()}@example.test`,
        password: "not-used",
        role: "user",
    });

    await Wallet.create({ userId: user._id, availableBalance: 10000, lockedBalance: 0 });

    try {
        // ---------------- Test 1: concurrent payouts race ----------------
        console.log("=== TEST 1: concurrent ₹8,000 + ₹8,000 payouts against ₹10,000 wallet ===");

        const makeReq = (idemKey, beneficiary) => ({
            user: { id: user._id.toString() },
            header(name) { return name.toLowerCase() === "idempotency-key" ? idemKey : undefined; },
            body: {
                amount: 8000,
                beneficiary_name: beneficiary,
                account_number: "1234567890",
                ifsc_code: "KKBK0000958",
                bank_name: "Kotak Mahindra Bank",
            },
        });

        const [resA, resB] = await Promise.all([
            runMiddlewareThenController(makeReq(`race-key-a-${Date.now()}`, "Race A")),
            runMiddlewareThenController(makeReq(`race-key-b-${Date.now()}`, "Race B")),
        ]);

        console.log("Request A:", resA.statusCode, resA.body?.msg || resA.body?.payout?.status);
        console.log("Request B:", resB.statusCode, resB.body?.msg || resB.body?.payout?.status);

        const succeededCount = [resA, resB].filter((r) => r.statusCode === 201).length;
        const failedCount = [resA, resB].filter((r) => r.statusCode === 400).length;

        const walletAfterRace = await Wallet.findOne({ userId: user._id }).lean();
        console.log("Wallet after race:", walletAfterRace.availableBalance, "available /", walletAfterRace.lockedBalance, "locked");

        const raceOk = succeededCount === 1 && failedCount === 1 && walletAfterRace.availableBalance >= 0;
        console.log(raceOk ? "PASS: exactly one payout reserved, no negative balance\n" : "FAIL: race condition not handled correctly\n");

        // ---------------- Test 2: idempotency duplicate submission ----------------
        console.log("=== TEST 2: same Idempotency-Key submitted twice concurrently ===");

        const sharedKey = `idem-test-${Date.now()}`;
        const idemReq = () => ({
            user: { id: user._id.toString() },
            header(name) { return name.toLowerCase() === "idempotency-key" ? sharedKey : undefined; },
            body: {
                amount: 500,
                beneficiary_name: "Idempotency Test",
                account_number: "1234567890",
                ifsc_code: "KKBK0000958",
                bank_name: "Kotak Mahindra Bank",
            },
        });

        const [idemResA, idemResB] = await Promise.all([
            runMiddlewareThenController(idemReq()),
            runMiddlewareThenController(idemReq()),
        ]);

        console.log("Idempotent request A:", idemResA.statusCode);
        console.log("Idempotent request B:", idemResB.statusCode);

        const payoutsForKey = await Payout.find({
            userId: user._id,
            beneficiary_name: "Idempotency Test",
        }).lean();

        console.log(`Payout documents created for this idempotency key: ${payoutsForKey.length} (expect 1)`);
        console.log(payoutsForKey.length === 1 ? "PASS: exactly one payout created\n" : "FAIL: duplicate payout created\n");

    } finally {
        await Payout.deleteMany({ userId: user._id });
        await LedgerTransaction.deleteMany({ userId: user._id });
        await Wallet.deleteMany({ userId: user._id });
        await IdempotencyKey.deleteMany({ userId: user._id });
        await User.deleteMany({ _id: user._id });
        console.log("Cleaned up test data.");
        await mongoose.disconnect();
    }
})().catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
});
