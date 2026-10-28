require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const LedgerTransaction = require("../models/LedgerTransaction");
const userController = require("../controllers/userController");

const fakeRes = () => ({
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
});

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

    const admin = await User.create({
        first_name: "Test", last_name: "Admin",
        mobile_number: `9${Date.now().toString().slice(-9)}`,
        email: `admin.override.${Date.now()}@example.test`,
        password: "x", role: "superadmin",
    });

    const merchant = await User.create({
        first_name: "Test", last_name: "Merchant",
        mobile_number: `8${Date.now().toString().slice(-9)}`,
        email: `merchant.override.${Date.now()}@example.test`,
        password: "x", role: "user",
    });

    await Wallet.create({ userId: merchant._id, availableBalance: 1000, lockedBalance: 0 });

    try {
        const req = {
            params: { id: merchant._id.toString() },
            user: { id: admin._id.toString() },
            body: { availableBalance: 5000 },
        };
        const res = fakeRes();
        await userController.updateUserWallet(req, res);

        console.log("HTTP", res.statusCode, res.body);

        const ledgerEntry = await LedgerTransaction.findOne({ userId: merchant._id, category: "ADJUSTMENT" }).lean();
        console.log("Ledger entry created:", ledgerEntry ? `${ledgerEntry.type} ${ledgerEntry.amount}` : "NONE");

        const ok = res.statusCode === 200 && res.body.availableBalance === 5000 && ledgerEntry && ledgerEntry.type === "CREDIT" && ledgerEntry.amount === 4000;
        console.log(ok ? "PASS: override applied AND ledger entry created" : "FAIL");

        // negative value rejected
        const res2 = fakeRes();
        await userController.updateUserWallet({ ...req, body: { availableBalance: -10 } }, res2);
        console.log("Negative value rejected:", res2.statusCode === 400 ? "PASS" : `FAIL (got ${res2.statusCode})`);

    } finally {
        await LedgerTransaction.deleteMany({ userId: merchant._id });
        await Wallet.deleteMany({ userId: { $in: [merchant._id] } });
        await User.deleteMany({ _id: { $in: [admin._id, merchant._id] } });
        console.log("Cleaned up.");
        await mongoose.disconnect();
    }
})().catch((e) => { console.error(e); process.exit(1); });
