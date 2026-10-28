const User = require('../models/User');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logActivity } = require('../utils/activityLogger');

// Multer config for profile image
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/profiles/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        if (allowedTypes.has(file.mimetype) && /\.(jpe?g|png|webp)$/i.test(file.originalname)) cb(null, true);
        else cb(new Error('Only image files are allowed (JPG, PNG, WEBP)'));
    }
});
exports.uploadMiddleware = upload.single('profile_image');

// GET /api/account/profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// POST /api/account/update-profile
exports.updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, company_name } = req.body;

        const errors = {};
        if (!first_name?.trim()) errors.first_name = 'First name is required';
        if (!last_name?.trim()) errors.last_name = 'Last name is required';
        if (Object.keys(errors).length) return res.status(422).json({ errors });

        const updateFields = {};
        if (first_name) updateFields.first_name = first_name.trim();
        if (last_name) updateFields.last_name = last_name.trim();
        if (company_name !== undefined) updateFields.company_name = String(company_name).trim().slice(0, 200);
        if (req.file) updateFields.profile_image = `/${req.file.path}`;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        logActivity({
            userId: req.user.id,
            type: "USER_ACTIVITY",
            action: "PROFILE_UPDATED",
            description: "Profile settings updated",
            resourceType: "USER",
            resourceId: req.user.id,
            req,
            metadata: { fields: Object.keys(updateFields) },
        });

        res.json({ msg: 'Profile updated successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// POST /api/account/change-password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const errors = {};
        if (!currentPassword) errors.currentPassword = 'Current password is required';
        if (!newPassword || newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
        if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
        if (Object.keys(errors).length) return res.status(422).json({ errors });

        const user = await User.findById(req.user.id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, 12);
        user.password = hashed;
        await user.save();

        logActivity({
            userId: req.user.id,
            type: "USER_ACTIVITY",
            action: "PASSWORD_CHANGED",
            description: "Account password changed",
            resourceType: "USER",
            resourceId: req.user.id,
            req,
        });

        res.json({ msg: 'Password changed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};
