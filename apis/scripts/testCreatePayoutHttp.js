/**
 * One-off HTTP-level smoke test for the Create Payout feature, exercised the
 * same way the frontend does: real Express server (must already be running,
 * `node index.js`), real JWT, real /api/funds/wallet-overview +
 * /api/payouts calls with an Idempotency-Key header.
 *
 * Run with: node scripts/testCreatePayoutHttp.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Payout = require("../models/Payout");
const LedgerTransaction = require("../models/LedgerTransaction");
const IdempotencyKey = require("../models/IdempotencyKey");

const BASE_URL = "http://localhost:1977/api";

const mintToken = (user) =>
    jwt.sign({ user: { id: user.id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: "1h" });

const call = async (method, path, { token, body, idempotencyKey } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["x-auth-token"] = token;
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let json = null;
    try {
        json = await res.json();
    } catch {
        // no body
    }

    return { status: res.status, body: json };
};

let pass = 0;
let fail = 0;
const check = (label, condition, extra = "") => {
    if (condition) {
        pass += 1;
        console.log(`PASS: ${label}`);
    } else {
        fail += 1;
        console.log(`FAIL: ${label} ${extra}`);
    }
};

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected.\n");

    const user = await User.create({
        first_name: "Http",
        last_name: "PayoutTest",
        mobile_number: `9${Date.now().toString().slice(-9)}`,
        email: `http.payout.${Date.now()}@example.test`,
        password: "not-used",
        role: "user",
    });

    await Wallet.create({ userId: user._id, availableBalance: 10000, lockedBalance: 0 });

    const otherUser = await User.create({
        first_name: "Other",
        last_name: "Merchant",
        mobile_number: `8${Date.now().toString().slice(-9)}`,
        email: `other.merchant.${Date.now()}@example.test`,
        password: "not-used",
        role: "user",
    });
    await Wallet.create({ userId: otherUser._id, availableBalance: 500, lockedBalance: 0 });

    const token = mintToken(user);

    try {
        // -------- 401: no token --------
        const noAuth = await call("GET", "/funds/wallet-overview");
        check("GET wallet-overview without token -> 401", noAuth.status === 401, JSON.stringify(noAuth));

        // -------- Wallet overview reflects real balance --------
        const walletRes = await call("GET", "/funds/wallet-overview", { token });
        check(
            "GET wallet-overview returns availableBalance=10000",
            walletRes.status === 200 && walletRes.body?.wallet?.availableBalance === 10000,
            JSON.stringify(walletRes.body)
        );

        // -------- 400: missing Idempotency-Key header --------
        const noKey = await call("POST", "/payouts", {
            token,
            body: { amount: 100, beneficiary_name: "X", account_number: "111122223333", ifsc_code: "HDFC0001234" },
        });
        check("POST /payouts without Idempotency-Key -> 400", noKey.status === 400, JSON.stringify(noKey.body));

        // -------- 400: invalid amount --------
        const badAmount = await call("POST", "/payouts", {
            token,
            idempotencyKey: `http-test-badamount-${Date.now()}`,
            body: { amount: -5, beneficiary_name: "X", account_number: "111122223333", ifsc_code: "HDFC0001234" },
        });
        check("POST /payouts with amount <= 0 -> 400", badAmount.status === 400, JSON.stringify(badAmount.body));

        // -------- 400: insufficient balance --------
        const tooMuch = await call("POST", "/payouts", {
            token,
            idempotencyKey: `http-test-toomuch-${Date.now()}`,
            body: { amount: 999999, beneficiary_name: "X", account_number: "111122223333", ifsc_code: "HDFC0001234" },
        });
        check(
            "POST /payouts exceeding balance -> 400",
            tooMuch.status === 400,
            JSON.stringify(tooMuch.body)
        );

        // -------- valid SUCCESS payout --------
        const successKey = `http-test-success-${Date.now()}`;
        const successBody = {
            amount: 2000,
            beneficiary_name: "Rahul Sharma",
            account_number: "111122223333",
            ifsc_code: "HDFC0001234",
            bank_name: "HDFC Bank",
            remarks: "HTTP test",
        };
        const successRes = await call("POST", "/payouts", { token, idempotencyKey: successKey, body: successBody });
        check(
            "POST /payouts valid request -> 201, status success",
            successRes.status === 201 && successRes.body?.payout?.status === "success",
            JSON.stringify(successRes.body)
        );
        check(
            "Wallet after SUCCESS: available=8000, locked=0",
            successRes.body?.wallet?.availableBalance === 8000 && successRes.body?.wallet?.lockedBalance === 0,
            JSON.stringify(successRes.body?.wallet)
        );

        // -------- duplicate submission with same key -> no second payout --------
        const dupRes = await call("POST", "/payouts", { token, idempotencyKey: successKey, body: successBody });
        check(
            "Same Idempotency-Key replayed -> 201 with SAME payout id (no duplicate)",
            dupRes.status === 201 && dupRes.body?.payout?._id === successRes.body?.payout?._id,
            JSON.stringify(dupRes.body)
        );

        const payoutCountAfterDup = await Payout.countDocuments({ userId: user._id, "beneficiary_name": "Rahul Sharma" });
        check("Exactly one Payout document exists for the replayed key", payoutCountAfterDup === 1, `count=${payoutCountAfterDup}`);

        // -------- same key, different payload -> 409 --------
        const conflictRes = await call("POST", "/payouts", {
            token,
            idempotencyKey: successKey,
            body: { ...successBody, amount: 3000 },
        });
        check("Same key + different payload -> 409", conflictRes.status === 409, JSON.stringify(conflictRes.body));

        // -------- FAILED scenario (mock) --------
        const failRes = await call("POST", "/payouts", {
            token,
            idempotencyKey: `http-test-fail-${Date.now()}`,
            body: { ...successBody, beneficiary_name: "MOCK_FAIL Test", amount: 1000 },
        });
        check(
            "MOCK_FAIL beneficiary -> payout.status failed, funds released",
            failRes.status === 201 && failRes.body?.payout?.status === "failed",
            JSON.stringify(failRes.body?.payout)
        );
        check(
            "Wallet after FAILED: available back to 8000, locked 0",
            failRes.body?.wallet?.availableBalance === 8000 && failRes.body?.wallet?.lockedBalance === 0,
            JSON.stringify(failRes.body?.wallet)
        );

        // -------- TIMEOUT -> UNKNOWN, funds stay locked --------
        const unknownRes = await call("POST", "/payouts", {
            token,
            idempotencyKey: `http-test-timeout-${Date.now()}`,
            body: { ...successBody, beneficiary_name: "MOCK_TIMEOUT Test", amount: 1500 },
        });
        check(
            "MOCK_TIMEOUT beneficiary -> payout.status unknown, funds locked",
            unknownRes.status === 201 &&
            unknownRes.body?.payout?.status === "unknown" &&
            unknownRes.body?.wallet?.lockedBalance === 1500 &&
            unknownRes.body?.wallet?.availableBalance === 6500,
            JSON.stringify(unknownRes.body)
        );

        // -------- security: cannot see/act on another merchant's data --------
        const otherToken = mintToken(otherUser);
        const myPayouts = await call("GET", "/payouts/my-payouts", { token: otherToken });
        const payoutList = myPayouts.body?.payouts;
        const leaked = Array.isArray(payoutList) && payoutList.some((p) => String(p.userId) === String(user._id));
        check(
            "Other merchant's /my-payouts does not include this user's payouts",
            myPayouts.status === 200 && Array.isArray(payoutList) && !leaked,
            JSON.stringify(myPayouts.body)
        );

        // Payout amount/userId cannot be manipulated from client - userId is
        // taken from the JWT (req.user.id), not from the request body.
        const spoofRes = await call("POST", "/payouts", {
            token: otherToken,
            idempotencyKey: `http-test-spoof-${Date.now()}`,
            body: { ...successBody, userId: user._id.toString(), amount: 100 },
        });
        const spoofedPayout = spoofRes.body?.payout ? await Payout.findById(spoofRes.body.payout._id).lean() : null;
        check(
            "Payout created while impersonating userId in body still belongs to the authenticated user",
            spoofedPayout && String(spoofedPayout.userId) === String(otherUser._id),
            JSON.stringify(spoofedPayout)
        );

        console.log(`\n${pass} passed, ${fail} failed`);
    } catch (err) {
        console.error("Test error:", err);
        fail += 1;
    } finally {
        await Payout.deleteMany({ userId: { $in: [user._id, otherUser._id] } });
        await LedgerTransaction.deleteMany({ userId: { $in: [user._id, otherUser._id] } });
        await Wallet.deleteMany({ userId: { $in: [user._id, otherUser._id] } });
        await IdempotencyKey.deleteMany({ userId: { $in: [user._id, otherUser._id] } });
        await User.deleteMany({ _id: { $in: [user._id, otherUser._id] } });
        console.log("Cleaned up test data.");
        await mongoose.disconnect();
    }

    process.exitCode = fail > 0 ? 1 : 0;
})().catch((err) => {
    console.error("Fatal test error:", err);
    process.exitCode = 1;
});
