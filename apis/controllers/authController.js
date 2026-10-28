const User = require('../models/User');
const Otp = require('../models/Otp');
const Wallet = require('../models/Wallet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const { logActivity } = require('../utils/activityLogger');

// Generate 6 digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.register = async (req, res) => {
    const { first_name, last_name, mobile_number, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = await User.findOne({ mobile_number });
        if (user) {
            return res.status(400).json({ msg: 'Mobile number already registered' });
        }

        const otpCode = generateOTP();
        // Expiration handled by Schema default, but we can be explicit if needed. Schema has 10 min default.

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            first_name,
            last_name,
            mobile_number,
            email,
            password: hashedPassword,
            isVerified: false
        });

        await user.save();

        const wallet = new Wallet({
            userId: user._id
        });
        await wallet.save();

        // Save OTP to Otp Collection with reference to User
        const otpEntry = new Otp({
            userId: user._id,
            otp: otpCode
        });
        await otpEntry.save();

        // Send OTP
        await sendEmail(email, otpCode);

        res.status(201).json({ msg: 'User registered, OTP sent to email', userId: user._id });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.login = async (req, res) => {
    const { emailOrMobile, password, isAdminLogin } = req.body;

    try {
        let user = await User.findOne({
            $or: [{ email: emailOrMobile.toLowerCase() }, { mobile_number: emailOrMobile }]
        });

        if (!user) {
            // No real account to attribute this attempt to - nothing to log
            // ownership-safely against (also already rate-limited upstream).
            return res.status(400).json({ msg: 'Invalid Credentials (User not found)' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logActivity({
                userId: user._id,
                type: 'LOGIN_HISTORY',
                action: 'LOGIN_FAILED',
                description: 'Failed login attempt',
                status: 'FAILED',
                failureReason: 'Invalid credentials',
                req,
            });
            return res.status(400).json({ msg: 'Invalid Credentials (Password mismatch)' });
        }

        if (isAdminLogin && user.role !== 'superadmin') {
            logActivity({
                userId: user._id,
                type: 'LOGIN_HISTORY',
                action: 'LOGIN_FAILED',
                description: 'Failed admin login attempt',
                status: 'FAILED',
                failureReason: 'Not authorized for admin login',
                req,
            });
            return res.status(403).json({ msg: 'Access Denied: Not a Super Admin' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;

                logActivity({
                    userId: user._id,
                    type: 'LOGIN_HISTORY',
                    action: 'LOGIN_SUCCESS',
                    description: 'Successful login',
                    status: 'SUCCESS',
                    req,
                });

                res.json({
                    token, user: {
                        id: user.id,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        email: user.email,
                        role: user.role,
                        isVerified: user.isVerified,
                        kycStatus: user.kycStatus,
                        accountType: user.accountType,
                        domain: user.domain
                    }
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.verifyOtp = async (req, res) => {
    const { userId, otp } = req.body;
    try {
        // Find the latest OTP for this user
        const otpRecord = await Otp.findOne({ userId }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({ msg: 'OTP not found or expired' });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }

        // Check expiration (although TTL handles deletion, good to check explicitly for race conditions)
        if (otpRecord.expiresAt < Date.now()) {
            return res.status(400).json({ msg: 'OTP has expired' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ msg: 'User not found' });

        user.isVerified = true;
        await user.save();

        // Delete used OTP
        await Otp.deleteOne({ _id: otpRecord._id });

        res.json({ msg: 'Account verified successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.resendOtp = async (req, res) => {
    const { userId, email } = req.body;
    let user;

    try {
        if (userId) {
            user = await User.findById(userId);
        } else if (email) {
            user = await User.findOne({ email });
        }

        if (!user) return res.status(400).json({ msg: 'User not found' });

        const otpCode = generateOTP();

        // Create new OTP record
        const otpEntry = new Otp({
            userId: user._id,
            otp: otpCode
        });
        await otpEntry.save();

        await sendEmail(user.email, otpCode);

        res.json({ msg: 'OTP resent successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
