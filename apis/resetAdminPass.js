require('dotenv').config({ quiet: true });
process.env.MONGO_QUIET = '1';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const { ensureDatabaseReady } = require('./config/db');

const ADMIN_EMAIL = String(process.env.ADMIN_RESET_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_RESET_PASSWORD || '';

const createUniqueMobileNumber = async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const mobileNumber = `9${crypto.randomInt(100000000, 1000000000)}`;
        if (!(await User.exists({ mobile_number: mobileNumber }))) return mobileNumber;
    }
    throw new Error('Unable to allocate admin mobile number');
};

const run = async () => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Admin reset values are not configured');
    if (ADMIN_PASSWORD.length < 8) throw new Error('Admin password is too short');

    await ensureDatabaseReady();

    const matchingUsers = await User.find({ email: ADMIN_EMAIL }).select('+password');
    if (matchingUsers.length > 1) throw new Error('Duplicate admin email records found');

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const admin = matchingUsers[0] || new User({
        first_name: 'BluePay',
        last_name: 'Admin',
        email: ADMIN_EMAIL,
        mobile_number: await createUniqueMobileNumber(),
        isVerified: true,
        accountType: 'corporate',
    });

    admin.password = hashedPassword;
    admin.role = 'superadmin';
    admin.status = 1;
    admin.isVerified = true;
    await admin.save();
};

(async () => {
    try {
        await run();
        console.log('Admin credentials reset successfully');
        process.exitCode = 0;
    } catch {
        console.error('Admin credentials reset failed');
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        process.exit(process.exitCode || 0);
    }
})();
