const User = require('../models/User');

// Resolves :userId to a real, non-superadmin merchant before any admin
// handler that manages a specific merchant's resources runs. This is what
// stops an admin request from ever operating on an arbitrary/forged id -
// the id is looked up and role-checked here, never trusted as-is from the
// URL. Shared by every admin route that manages per-merchant resources
// (webhooks, developer credentials, ...) so this check has one definition.
const requireManagedMerchant = async (req, res, next) => {
    try {
        const merchant = await User.findById(req.params.userId).select('_id role').lean();
        if (!merchant || merchant.role === 'superadmin') {
            return res.status(404).json({ msg: 'Merchant not found' });
        }
        req.targetUserId = merchant._id;
        next();
    } catch (error) {
        return res.status(400).json({ msg: 'Invalid merchant id' });
    }
};

module.exports = requireManagedMerchant;
