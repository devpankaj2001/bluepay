/**
 * Quick follow-up check for the remaining USER_ACTIVITY hooks not covered
 * by testActivityLogs.js: developer credential rotation/revocation and
 * webhook endpoint create/update/regenerate-secret/delete. Confirms each
 * produces exactly one activity row and never logs the actual secret.
 *
 * Run with: node scripts/testActivityLogsExtra.js (server must be running)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const ActivityLog = require("../models/ActivityLog");
const DeveloperCredential = require("../models/DeveloperCredential");
const WebhookEndpoint = require("../models/WebhookEndpoint");
const WebhookDelivery = require("../models/WebhookDelivery");

const BASE_URL = "http://localhost:1977/api";

const mintToken = (user) =>
    jwt.sign({ user: { id: user.id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: "1h" });

const call = async (method, path, { token, body } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["x-auth-token"] = token;
    const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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

    const user = await User.create({
        first_name: "Activity", last_name: "ExtraTest",
        mobile_number: `7${Date.now().toString().slice(-9)}`,
        email: `activity.extra.${Date.now()}@example.test`,
        password: "not-used", role: "user",
    });
    await Wallet.create({ userId: user._id, availableBalance: 1000, lockedBalance: 0 });
    const token = mintToken(user);

    try {
        // -------- Developer credential rotate/revoke --------
        const rotateRes = await call("POST", "/developer/credentials/test/rotate", { token });
        check("Rotate developer credential succeeds", rotateRes.status === 201, JSON.stringify(rotateRes.body));

        const revokeRes = await call("POST", "/developer/credentials/test/revoke", { token });
        check("Revoke developer credential succeeds", revokeRes.status === 200, JSON.stringify(revokeRes.body));

        await new Promise((r) => setTimeout(r, 300));

        const userActivity = await call("GET", "/activity/user", { token });
        const actions = userActivity.body?.data?.map((r) => r.action) || [];
        check("USER_ACTIVITY has API_CREDENTIAL_ROTATED", actions.includes("API_CREDENTIAL_ROTATED"), JSON.stringify(actions));
        check("USER_ACTIVITY has API_CREDENTIAL_REVOKED", actions.includes("API_CREDENTIAL_REVOKED"), JSON.stringify(actions));

        // -------- Webhook endpoint lifecycle --------
        const createRes = await call("POST", "/webhooks/endpoints", {
            token,
            body: { url: "https://example.com/bluepay-webhook", events: ["payout.success"], environment: "live" },
        });
        check("Create webhook endpoint succeeds", createRes.status === 201, JSON.stringify(createRes.body));
        const endpointId = createRes.body?.endpoint?._id || createRes.body?.endpoint?.id;

        if (endpointId) {
            const updateRes = await call("PUT", `/webhooks/endpoints/${endpointId}`, { token, body: { isActive: false } });
            check("Disable webhook endpoint succeeds", updateRes.status === 200, JSON.stringify(updateRes.body));

            const regenRes = await call("POST", `/webhooks/endpoints/${endpointId}/regenerate-secret`, { token });
            check("Regenerate webhook secret succeeds", regenRes.status === 200, JSON.stringify(regenRes.body));

            const deleteRes = await call("DELETE", `/webhooks/endpoints/${endpointId}`, { token });
            check("Delete webhook endpoint succeeds", deleteRes.status === 200, JSON.stringify(deleteRes.body));
        }

        await new Promise((r) => setTimeout(r, 300));

        const userActivity2 = await call("GET", "/activity/user?limit=50", { token });
        const actions2 = userActivity2.body?.data?.map((r) => r.action) || [];
        check("USER_ACTIVITY has WEBHOOK_ENDPOINT_CREATED", actions2.includes("WEBHOOK_ENDPOINT_CREATED"), JSON.stringify(actions2));
        check("USER_ACTIVITY has WEBHOOK_ENDPOINT_DISABLED", actions2.includes("WEBHOOK_ENDPOINT_DISABLED"), JSON.stringify(actions2));
        check("USER_ACTIVITY has WEBHOOK_SECRET_REGENERATED", actions2.includes("WEBHOOK_SECRET_REGENERATED"), JSON.stringify(actions2));
        check("USER_ACTIVITY has WEBHOOK_ENDPOINT_DELETED", actions2.includes("WEBHOOK_ENDPOINT_DELETED"), JSON.stringify(actions2));

        // -------- Sensitive-data scan on these specific rows --------
        const rows = await ActivityLog.find({ userId: user._id }).lean();
        const serialized = JSON.stringify(rows).toLowerCase();
        check("No 'bps_' (webhook/API secret prefix) in any activity row", !serialized.includes("bps_"));
        check("No 'whsec_' (webhook secret prefix) in any activity row", !serialized.includes("whsec_"));

        console.log(`\n${pass} passed, ${fail} failed`);
    } catch (err) {
        console.error("Test error:", err);
        fail += 1;
    } finally {
        await ActivityLog.deleteMany({ userId: user._id });
        await DeveloperCredential.deleteMany({ userId: user._id });
        await WebhookEndpoint.deleteMany({ userId: user._id });
        await WebhookDelivery.deleteMany({ userId: user._id });
        await Wallet.deleteMany({ userId: user._id });
        await User.deleteMany({ _id: user._id });
        console.log("Cleaned up test data.");
        await mongoose.disconnect();
    }

    process.exitCode = fail > 0 ? 1 : 0;
})().catch((err) => {
    console.error("Fatal test error:", err);
    process.exitCode = 1;
});
