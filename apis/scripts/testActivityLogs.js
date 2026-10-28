/**
 * End-to-end HTTP test for the Activity Logs module: login history, user
 * activity (payout creation), API activity (merchant API key success +
 * auth failure), IP logs, pagination, ownership isolation, and a scan of
 * every stored ActivityLog document for accidentally-logged secrets.
 *
 * Run with: node scripts/testActivityLogs.js  (server must already be running)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Payout = require("../models/Payout");
const LedgerTransaction = require("../models/LedgerTransaction");
const IdempotencyKey = require("../models/IdempotencyKey");
const ActivityLog = require("../models/ActivityLog");
const ApiRequestMetric = require("../models/ApiRequestMetric");
const DeveloperCredential = require("../models/DeveloperCredential");
const { hashSecret } = require("../utils/developerCredentialSecurity");

const BASE_URL = "http://localhost:1977/api";
const PLAIN_PASSWORD = "TestPass123!";

const mintToken = (user) =>
    jwt.sign({ user: { id: user.id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: "1h" });

const call = async (method, path, { token, body, headers = {} } = {}) => {
    const finalHeaders = { "Content-Type": "application/json", ...headers };
    if (token) finalHeaders["x-auth-token"] = token;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    let json = null;
    try { json = await res.json(); } catch { /* no body */ }
    return { status: res.status, body: json };
};

let pass = 0;
let fail = 0;
const check = (label, condition, extra = "") => {
    if (condition) { pass += 1; console.log(`PASS: ${label}`); }
    else { fail += 1; console.log(`FAIL: ${label} ${extra}`); }
};

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected.\n");

    const hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, 10);

    const userA = await User.create({
        first_name: "Activity", last_name: "MerchantA",
        mobile_number: `9${Date.now().toString().slice(-9)}`,
        email: `activity.a.${Date.now()}@example.test`,
        password: hashedPassword, role: "user",
    });
    await Wallet.create({ userId: userA._id, availableBalance: 10000, lockedBalance: 0 });

    const userB = await User.create({
        first_name: "Activity", last_name: "MerchantB",
        mobile_number: `8${Date.now().toString().slice(-9)}`,
        email: `activity.b.${Date.now()}@example.test`,
        password: hashedPassword, role: "user",
    });
    await Wallet.create({ userId: userB._id, availableBalance: 5000, lockedBalance: 0 });

    // A live, real API credential for userA, so the merchant-API path can
    // be exercised for real (not synthetic ActivityLog rows).
    const apiKey = `bp_test_${crypto.randomBytes(24).toString("hex")}`;
    const apiSecret = `bps_${crypto.randomBytes(32).toString("hex")}`;
    await DeveloperCredential.create({
        userId: userA._id,
        environment: "test",
        apiKey,
        secretHash: await hashSecret(apiSecret),
        secretLast4: apiSecret.slice(-4),
        scopes: ["payouts:read", "payouts:write", "wallet:read"],
        active: true,
    });

    try {
        // -------- LOGIN HISTORY: failed then successful login --------
        const badLogin = await call("POST", "/auth/login", {
            body: { emailOrMobile: userA.email, password: "WrongPassword!" },
        });
        check("Failed login returns 400", badLogin.status === 400, JSON.stringify(badLogin.body));

        const goodLogin = await call("POST", "/auth/login", {
            body: { emailOrMobile: userA.email, password: PLAIN_PASSWORD },
        });
        check("Successful login returns 200 with token", goodLogin.status === 200 && !!goodLogin.body?.token, JSON.stringify(goodLogin.body));

        const tokenA = goodLogin.body?.token || mintToken(userA);
        const tokenB = mintToken(userB);

        await new Promise((r) => setTimeout(r, 300)); // let fire-and-forget logActivity calls land

        const loginHistory = await call("GET", "/activity/login", { token: tokenA });
        check(
            "Login history shows both FAILED and SUCCESS rows for userA",
            loginHistory.status === 200 &&
            loginHistory.body?.data?.some((r) => r.status === "FAILED" && r.action === "LOGIN_FAILED") &&
            loginHistory.body?.data?.some((r) => r.status === "SUCCESS" && r.action === "LOGIN_SUCCESS"),
            JSON.stringify(loginHistory.body?.data?.map((r) => r.action))
        );
        check(
            "Login history pagination shape present",
            loginHistory.body?.pagination && typeof loginHistory.body.pagination.total === "number"
        );

        // -------- USER ACTIVITY: create a real payout --------
        const idemKey = `activity-test-${Date.now()}`;
        const payoutRes = await call("POST", "/payouts", {
            token: tokenA,
            headers: { "Idempotency-Key": idemKey },
            body: {
                amount: 1500,
                beneficiary_name: "Activity Test Beneficiary",
                account_number: "111122223333",
                ifsc_code: "HDFC0001234",
                bank_name: "HDFC Bank",
            },
        });
        check("Payout created (201)", payoutRes.status === 201, JSON.stringify(payoutRes.body));

        await new Promise((r) => setTimeout(r, 300));

        const userActivity = await call("GET", "/activity/user", { token: tokenA });
        const payoutActivityRow = userActivity.body?.data?.find((r) => r.action === "PAYOUT_CREATED");
        check(
            "User activity shows PAYOUT_CREATED for the payout just made",
            userActivity.status === 200 && !!payoutActivityRow,
            JSON.stringify(userActivity.body?.data?.map((r) => r.action))
        );
        check(
            "PAYOUT_CREATED activity row does not contain account number or amount digits leak beyond description",
            payoutActivityRow && !JSON.stringify(payoutActivityRow).includes("111122223333")
        );

        // -------- API ACTIVITY: real merchant-API-key request (success) --------
        const apiRes = await fetch(`${BASE_URL}/v1/wallet/balance`, {
            headers: {
                "x-api-key": apiKey,
                "x-api-secret": apiSecret,
                "x-bluepay-environment": "test",
            },
        });
        check("Merchant API request (wallet/balance) succeeds", apiRes.status === 200, `status=${apiRes.status}`);

        // -------- API ACTIVITY: failed auth (wrong secret, but real key) --------
        const apiFailRes = await fetch(`${BASE_URL}/v1/wallet/balance`, {
            headers: {
                "x-api-key": apiKey,
                "x-api-secret": `bps_${crypto.randomBytes(32).toString("hex")}`,
                "x-bluepay-environment": "test",
            },
        });
        check("Merchant API request with wrong secret -> 401", apiFailRes.status === 401);

        await new Promise((r) => setTimeout(r, 400));

        const apiActivity = await call("GET", "/activity/api", { token: tokenA });
        const hasSuccessRow = apiActivity.body?.data?.some((r) => r.status === "SUCCESS" && r.endpoint?.includes("wallet/balance"));
        const hasFailedRow = apiActivity.body?.data?.some((r) => r.status === "FAILED");
        check(
            "API activity shows the successful wallet/balance call (from ApiRequestMetric)",
            apiActivity.status === 200 && hasSuccessRow,
            JSON.stringify(apiActivity.body?.data)
        );
        check("API activity shows the failed-auth attempt (from ActivityLog)", hasFailedRow);

        const metricCount = await ApiRequestMetric.countDocuments({ userId: userA._id });
        check("Exactly one ApiRequestMetric row exists for the successful call (no duplicate write)", metricCount === 1, `count=${metricCount}`);

        // -------- IP LOGS --------
        const ipLogs = await call("GET", "/activity/ip", { token: tokenA });
        check(
            "IP logs returns at least one grouped IP row with a real IP address",
            ipLogs.status === 200 && Array.isArray(ipLogs.body?.data) && ipLogs.body.data.length > 0 && !!ipLogs.body.data[0].ipAddress,
            JSON.stringify(ipLogs.body?.data)
        );
        check(
            "IP logs never invents an address (only IPs seen in real requests)",
            ipLogs.body?.data?.every((row) => row.ipAddress && row.ipAddress !== "0.0.0.0")
        );

        // -------- PAGINATION --------
        const page1 = await call("GET", "/activity/login?page=1&limit=1", { token: tokenA });
        check(
            "Pagination limit=1 returns exactly 1 row and correct totalPages",
            page1.status === 200 && page1.body?.data?.length === 1 && page1.body?.pagination?.limit === 1,
            JSON.stringify(page1.body?.pagination)
        );

        // -------- SEARCH / DATE FILTER --------
        const searchRes = await call("GET", "/activity/user?search=PAYOUT_CREATED", { token: tokenA });
        check(
            "Search filter for 'PAYOUT_CREATED' returns only matching rows",
            searchRes.status === 200 && searchRes.body?.data?.every((r) => r.action.includes("PAYOUT_CREATED") || r.description?.includes("Payout")),
            JSON.stringify(searchRes.body?.data?.map((r) => r.action))
        );

        const futureDateRes = await call("GET", `/activity/user?dateFrom=2099-01-01`, { token: tokenA });
        check("Future dateFrom filter returns zero rows", futureDateRes.status === 200 && futureDateRes.body?.data?.length === 0);

        // -------- OWNERSHIP ISOLATION: Merchant B must never see Merchant A's activity --------
        const bUserActivity = await call("GET", "/activity/user", { token: tokenB });
        const bLoginHistory = await call("GET", "/activity/login", { token: tokenB });
        const bApiActivity = await call("GET", "/activity/api", { token: tokenB });
        const bIpLogs = await call("GET", "/activity/ip", { token: tokenB });

        check("Merchant B's user activity is empty (no leakage from A)", bUserActivity.body?.data?.length === 0, JSON.stringify(bUserActivity.body?.data));
        check("Merchant B's login history is empty (no leakage from A)", bLoginHistory.body?.data?.length === 0);
        check("Merchant B's API activity is empty (no leakage from A)", bApiActivity.body?.data?.length === 0);
        check("Merchant B's IP logs is empty (no leakage from A)", bIpLogs.body?.data?.length === 0);

        // Direct DB check too, not just via the API.
        const crossOwnershipCount = await ActivityLog.countDocuments({ userId: userA._id, _id: { $exists: true } });
        const bOwnsAnyARows = await ActivityLog.exists({ userId: userB._id, description: { $regex: "Activity Test Beneficiary" } });
        check("No ActivityLog row created for A's payout is owned by B", !bOwnsAnyARows);
        check("ActivityLog rows exist for merchant A (sanity)", crossOwnershipCount > 0);

        // -------- UNAUTHENTICATED ACCESS --------
        const noAuth = await call("GET", "/activity/user");
        check("GET /activity/user without token -> 401", noAuth.status === 401);

        // -------- SENSITIVE-DATA SCAN --------
        const allRows = await ActivityLog.find({ userId: { $in: [userA._id, userB._id] } }).lean();
        const serialized = JSON.stringify(allRows).toLowerCase();

        const forbiddenSubstrings = [
            PLAIN_PASSWORD.toLowerCase(),
            hashedPassword.toLowerCase(),
            apiSecret.toLowerCase(),
            "111122223333", // full account number
            "bearer ",
        ];

        forbiddenSubstrings.forEach((needle) => {
            check(`ActivityLog never contains "${needle.slice(0, 20)}..."`, !serialized.includes(needle));
        });

        const metricRows = await ApiRequestMetric.find({ userId: userA._id }).lean();
        const metricSerialized = JSON.stringify(metricRows).toLowerCase();
        check("ApiRequestMetric never contains the API secret", !metricSerialized.includes(apiSecret.toLowerCase()));

        console.log(`\n${pass} passed, ${fail} failed`);
    } catch (err) {
        console.error("Test error:", err);
        fail += 1;
    } finally {
        await ActivityLog.deleteMany({ userId: { $in: [userA._id, userB._id] } });
        await ApiRequestMetric.deleteMany({ userId: { $in: [userA._id, userB._id] } });
        await DeveloperCredential.deleteMany({ userId: { $in: [userA._id, userB._id] } });
        await Payout.deleteMany({ userId: { $in: [userA._id, userB._id] } });
        await LedgerTransaction.deleteMany({ userId: { $in: [userA._id, userB._id] } });
        await Wallet.deleteMany({ userId: { $in: [userA._id, userB._id] } });
        await IdempotencyKey.deleteMany({ userId: { $in: [userA._id, userB._id] } });
        await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
        console.log("Cleaned up test data.");
        await mongoose.disconnect();
    }

    process.exitCode = fail > 0 ? 1 : 0;
})().catch((err) => {
    console.error("Fatal test error:", err);
    process.exitCode = 1;
});
