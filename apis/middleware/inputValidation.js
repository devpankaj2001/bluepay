const badRequest = (message) => (req, res, next) => res.status(400).json({ msg: message });

const validateLogin = (req, res, next) => {
    const { emailOrMobile, password } = req.body || {};
    if (typeof emailOrMobile !== 'string' || !emailOrMobile.trim() || emailOrMobile.length > 254) return badRequest('Email or mobile number is required')(req, res, next);
    if (typeof password !== 'string' || !password || password.length > 256) return badRequest('Password is required')(req, res, next);
    return next();
};

const validateMerchantPayout = (req, res, next) => {
    const body = req.body || {};
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return badRequest('Invalid payout amount')(req, res, next);
    if (typeof body.beneficiary_name !== 'string' || !body.beneficiary_name.trim() || body.beneficiary_name.length > 200) return badRequest('Beneficiary name is required')(req, res, next);
    if (typeof body.account_number !== 'string' || !/^\d{9,18}$/.test(body.account_number.trim())) return badRequest('Invalid account number')(req, res, next);
    if (typeof body.ifsc_code !== 'string' || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(body.ifsc_code.trim())) return badRequest('Invalid IFSC code')(req, res, next);
    if (body.bank_name !== undefined && (typeof body.bank_name !== 'string' || body.bank_name.length > 200)) return badRequest('Invalid bank name')(req, res, next);
    return next();
};

const validateMerchantPayoutQuery = (req, res, next) => {
    const { page, limit, amountMin, amountMax, dateFrom, dateTo, status } = req.query;
    if (page !== undefined && (!/^\d+$/.test(page) || Number(page) < 1)) return badRequest('Invalid page')(req, res, next);
    if (limit !== undefined && (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100)) return badRequest('Invalid limit')(req, res, next);
    if (amountMin !== undefined && (!Number.isFinite(Number(amountMin)) || Number(amountMin) < 0)) return badRequest('Invalid amountMin')(req, res, next);
    if (amountMax !== undefined && (!Number.isFinite(Number(amountMax)) || Number(amountMax) < 0)) return badRequest('Invalid amountMax')(req, res, next);
    for (const field of ['dateFrom', 'dateTo']) {
        if (req.query[field] !== undefined && Number.isNaN(new Date(req.query[field]).getTime())) return badRequest(`Invalid ${field}`)(req, res, next);
    }
    if (status !== undefined && !['all', 'pending', 'processing', 'success', 'failed', 'unknown'].includes(status)) return badRequest('Invalid status filter')(req, res, next);
    return next();
};

module.exports = { validateLogin, validateMerchantPayout, validateMerchantPayoutQuery };