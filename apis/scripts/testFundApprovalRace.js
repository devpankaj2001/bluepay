require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const FundRequest = require("../models/FundRequest");
const LedgerTransaction = require("../models/LedgerTransaction");
const fundController = require("../controllers/fundController");

const fakeRes = () => ({
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
});

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

    const admin = await User.create({
        first_name: "T", last_name: "Admin",
        mobile_number: `9${Date.now().toString().slice(-9)}`,
        email: `admin.fundrace.${Date.now()}@example.test`,
        password: "x", role: "superadmin",
    });
    const merchant = await User.create({
        first_name: "T", last_name: "Merchant",
        mobile_number: `8${Date.now().toString().slice(-9)}`,
        email: `merchant.fundrace.${Date.now()}@example.test`,
        password: "x", role: "user",
    });
    await Wallet.create({ userId: merchant._id, availableBalance: 0, lockedBalance: 0 });

    const fundRequest = await FundRequest.create({
        userId: merchant._id, amount: 5000, UTR: `UTRRACE${Date.now()}`,
        utr_number: `UTRRACE${Date.now()}`, status: "pending",
    });

    try {
        const req = () => ({
            params: { id: fundRequest._id.toString() },
            user: { id: admin._id.toString() },
            body: { adminRemarks: "race test" },
        });

        const [resA, resB] = await Promise.all([
            fundController.approveFundRequest(req(), fakeRes()),
            fundController.approveFundRequest(req(), fakeRes()),
        ]);
        // Promise.all above resolves with the return values of the handler
        // (which is whatever res.json() returns == res itself for our fake),
        // but since we passed fresh fakeRes() per call already captured
        // inside, just re-fetch from DB for ground truth.

        const wallet = await Wallet.findOne({ userId: merchant._id }).lean();
        const ledgerEntries = await LedgerTransaction.find({ userId: merchant._id, category: "FUNDING" }).lean();

        console.log("Final wallet.availableBalance:", wallet.availableBalance, "(expect 5000, NOT 10000)");
        console.log("FUNDING ledger entries created:", ledgerEntries.length, "(expect 1)");

        const ok = wallet.availableBalance === 5000 && ledgerEntries.length === 1;
        console.log(ok ? "PASS: concurrent approve did not double-credit" : "FAIL: double credit occurred!");

    } finally {
        await LedgerTransaction.deleteMany({ userId: merchant._id });
        await FundRequest.deleteMany({ userId: merchant._id });
        await Wallet.deleteMany({ userId: merchant._id });
        await User.deleteMany({ _id: { $in: [admin._id, merchant._id] } });
        console.log("Cleaned up.");
        await mongoose.disconnect();
    }
})().catch((e) => { console.error(e); process.exit(1); });
