const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const adminEmail = 'admin@bluepay.com';
        const adminPass = process.env.ADMIN_SEED_PASSWORD;
        if (!adminPass || adminPass.length < 12) {
            throw new Error('ADMIN_SEED_PASSWORD must be configured with at least 12 characters');
        }
        const mobile = '9999999999';

        let admin = await User.findOne({ email: adminEmail });
        if (admin) {
            console.log('Super Admin already exists');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPass, salt);

        admin = new User({
            first_name: 'Super',
            last_name: 'Admin',
            email: adminEmail,
            mobile_number: mobile,
            password: hashedPassword,
            role: 'superadmin',
            status: 1,
            isVerified: true
        });

        await admin.save();
        console.log(`Super Admin created successfully.`);
        console.log(`Email: ${adminEmail}`);
        console.log('Admin password configured from environment and not printed.');

        process.exit();

    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
