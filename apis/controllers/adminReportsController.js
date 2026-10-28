const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');

const ApiRequestMetric = require('../models/ApiRequestMetric');
const FundRequest = require('../models/FundRequest');
const LedgerTransaction = require('../models/LedgerTransaction');
const Payout = require('../models/Payout');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 10000;

const parseDate = (value, endOfDay = false) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
};

const parseCommonQuery = (query) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(query.limit, 10) || 25));
    const startDate = parseDate(query.startDate);
    const endDate = parseDate(query.endDate, true);
    if ((query.startDate && !startDate) || (query.endDate && !endDate)) {
        const error = new Error('Dates must be valid ISO dates');
        error.statusCode = 400;
        throw error;
    }
    if (startDate && endDate && startDate > endDate) {
        const error = new Error('startDate must be before endDate');
        error.statusCode = 400;
        throw error;
    }
    return { page, limit, startDate, endDate, search: String(query.search || '').trim().slice(0, 100) };
};

const dateMatch = ({ startDate, endDate }, field = 'createdAt') => {
    if (!startDate && !endDate) return {};
    return { [field]: { ...(startDate ? { $gte: startDate } : {}), ...(endDate ? { $lte: endDate } : {}) } };
};

const toSafeUser = (user) => ({
    _id: user._id,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    email: user.email,
});

const getUserIds = async (search) => {
    if (!search) return null;
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({ role: { $ne: 'superadmin' }, $or: [{ first_name: regex }, { last_name: regex }, { email: regex }] }).select('_id').lean();
    return users.map((user) => user._id);
};

// Search matches transaction id / reference id / description (UTRs for
// fund-approval credits are embedded in the description text, since the
// ledger schema has no dedicated UTR field) as well as merchant name/email.
// `forcedUserId`, when set, scopes the report to exactly that merchant -
// used by the merchant-facing report endpoints below so a merchant can
// never see another merchant's rows regardless of what they search for.
const getTransactions = async (query, includeRows = false, forcedUserId = null) => {
    const filters = parseCommonQuery(query);
    const match = { ...dateMatch(filters), ...(query.type ? { type: String(query.type).toUpperCase() } : {}), ...(query.status ? { status: String(query.status).toUpperCase() } : {}) };
    if (!['CREDIT', 'DEBIT', undefined].includes(match.type)) throw Object.assign(new Error('Invalid transaction type'), { statusCode: 400 });
    if (query.status && !['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'].includes(match.status)) throw Object.assign(new Error('Invalid transaction status'), { statusCode: 400 });

    if (forcedUserId) {
        match.userId = forcedUserId;
        if (filters.search) {
            const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [
                { transactionId: regex },
                { referenceId: regex },
                { description: regex },
                { 'metadata.utr': regex },
            ];
        }
    } else if (filters.search) {
        const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const userIds = await getUserIds(filters.search);
        match.$or = [
            { transactionId: regex },
            { referenceId: regex },
            { description: regex },
            { 'metadata.utr': regex },
            ...(userIds?.length ? [{ userId: { $in: userIds } }] : []),
        ];
    }
    const pipeline = [
        { $match: match },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $match: { 'user.role': { $ne: 'superadmin' } } },
        { $sort: { createdAt: -1 } },
    ];
    const [summary] = await LedgerTransaction.aggregate([...pipeline, { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } }]);
    const rows = await LedgerTransaction.aggregate([...pipeline, { $skip: includeRows ? 0 : (filters.page - 1) * filters.limit }, { $limit: includeRows ? MAX_EXPORT_ROWS : filters.limit }, { $project: { _id: 1, transactionId: 1, createdAt: 1, type: 1, category: 1, amount: 1, balanceAfter: 1, status: 1, referenceId: 1, referenceType: 1, description: 1, metadata: 1, user: { _id: 1, first_name: 1, last_name: 1, email: 1 } } }]);
    const total = summary?.count || 0;
    return { rows: rows.map((row) => ({ ...row, merchant: toSafeUser(row.user), user: undefined })), total, totalAmount: summary?.amount || 0, page: filters.page, limit: filters.limit, filters };
};

const maskTransactionUserName = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return `${parts[0].slice(0, 2)}XXXX`;

    const givenName = parts.shift();
    const surnamePrefix = parts.join('').slice(0, 4);
    return `${givenName}XXXX${surnamePrefix}XXXX`;
};

const maskTransactionAccountNumber = (accountNumber) => {
    const value = String(accountNumber || '').replace(/\s/g, '');
    return value.length >= 4 ? `XXXXXXXX${value.slice(-4)}` : '';
};

const getTransactionLogs = async (query) => {
    const report = await getTransactions(query);
    const payoutIds = [...new Set(report.rows
        .filter((row) => row.referenceType === 'Payout' && mongoose.isValidObjectId(row.referenceId))
        .map((row) => row.referenceId))];
    const payouts = payoutIds.length
        ? await Payout.find({ _id: { $in: payoutIds } }).select('_id account_number provider').lean()
        : [];
    const payoutsById = new Map(payouts.map((payout) => [String(payout._id), payout]));

    return {
        ...report,
        rows: report.rows.map((row) => {
            const payout = row.referenceType === 'Payout' ? payoutsById.get(String(row.referenceId)) : null;
            const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
            const paymentMethod = [
                metadata.paymentMethod,
                metadata.payment_method,
                metadata.provider,
                payout?.provider,
            ].find((value) => typeof value === 'string' && value.trim()) || '';

            return {
                _id: row._id,
                transactionId: row.transactionId,
                userName: maskTransactionUserName(row.merchant?.name),
                email: row.merchant?.email || '',
                accountNumber: maskTransactionAccountNumber(payout?.account_number),
                type: row.type,
                amount: row.amount,
                status: row.status,
                paymentMethod,
                description: row.description || '',
                createdAt: row.createdAt,
            };
        }),
    };
};

const getWallets = async (query, includeRows = false, forcedUserId = null) => {
    const filters = parseCommonQuery(query);
    let match;
    if (forcedUserId) {
        match = { userId: forcedUserId };
    } else {
        const userIds = await getUserIds(filters.search);
        match = userIds ? { userId: { $in: userIds } } : {};
    }
    const [wallets, total] = await Promise.all([
        Wallet.find(match).populate({ path: 'userId', select: 'first_name last_name email role' }).sort({ updatedAt: -1 }).skip(includeRows ? 0 : (filters.page - 1) * filters.limit).limit(includeRows ? MAX_EXPORT_ROWS : filters.limit).lean(),
        Wallet.countDocuments(match),
    ]);
    const filtered = wallets.filter((wallet) => wallet.userId?.role !== 'superadmin');
    const ids = filtered.map((wallet) => wallet.userId._id);
    const range = dateMatch(filters);
    const [ledger, payouts, funding] = await Promise.all([
        LedgerTransaction.aggregate([{ $match: { userId: { $in: ids }, ...range } }, { $group: { _id: { userId: '$userId', type: '$type' }, amount: { $sum: '$amount' } } }]),
        Payout.aggregate([{ $match: { userId: { $in: ids }, ...range } }, { $group: { _id: { userId: '$userId', status: '$status' }, count: { $sum: 1 } } }]),
        FundRequest.aggregate([{ $match: { userId: { $in: ids }, status: 'approved', ...range } }, { $group: { _id: '$userId', amount: { $sum: '$amount' } } }]),
    ]);
    const byLedger = new Map(ledger.map((item) => [`${item._id.userId}:${item._id.type}`, item.amount]));
    const byPayout = new Map(payouts.map((item) => [`${item._id.userId}:${item._id.status}`, item.count]));
    const byFunding = new Map(funding.map((item) => [String(item._id), item.amount]));
    const rows = filtered.map((wallet) => {
        const id = String(wallet.userId._id);
        return { merchant: toSafeUser(wallet.userId), availableBalance: wallet.availableBalance, lockedBalance: wallet.lockedBalance, totalPayoutSent: wallet.totalPayoutSent, totalFunding: byFunding.get(id) || byLedger.get(`${id}:CREDIT`) || 0, successfulPayouts: byPayout.get(`${id}:success`) || 0, failedPayouts: byPayout.get(`${id}:failed`) || 0, updatedAt: wallet.updatedAt };
    });
    return { rows, total, totalAmount: rows.reduce((sum, row) => sum + row.availableBalance + row.lockedBalance, 0), page: filters.page, limit: filters.limit, filters };
};

// Search matches endpoint / requestId as well as merchant name/email. Rows
// are the individual ApiRequestMetric records (paginated) for the request
// table; the aggregates below (endpoints/merchants/dates/statuses) power
// the analytics/merchant-usage views and are unaffected by pagination.
const getApiUsage = async (query, includeRows = false, forcedUserId = null) => {
    const filters = parseCommonQuery(query);
    const match = { ...dateMatch(filters) };

    if (forcedUserId) {
        match.userId = forcedUserId;
        if (filters.search) {
            const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [{ endpoint: regex }, { requestId: regex }];
        }
    } else if (filters.search) {
        const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const userIds = await getUserIds(filters.search);
        match.$or = [
            { endpoint: regex },
            { requestId: regex },
            ...(userIds?.length ? [{ userId: { $in: userIds } }] : []),
        ];
    }

    if (query.statusCode) {
        if (!/^\d{3}$/.test(String(query.statusCode))) throw Object.assign(new Error('Invalid status code'), { statusCode: 400 });
        match.statusCode = Number(query.statusCode);
    }

    if (query.method) {
        const method = String(query.method).toUpperCase();
        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw Object.assign(new Error('Invalid HTTP method'), { statusCode: 400 });
        match.method = method;
    }

    if (query.environment) {
        if (!['test', 'live'].includes(query.environment)) throw Object.assign(new Error('Invalid environment'), { statusCode: 400 });
        match.environment = query.environment;
    }

    if (query.success !== undefined && ['true', 'false'].includes(String(query.success))) {
        match.success = String(query.success) === 'true';
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { createdAt: _dateRangeFilter, ...matchWithoutDateRange } = match;
    const todayMatch = { ...matchWithoutDateRange, createdAt: { $gte: todayStart } };

    const [summary, endpoints, merchants, dates, statuses, todayTotal, rows] = await Promise.all([
        ApiRequestMetric.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: 1 }, successful: { $sum: { $cond: ['$success', 1, 0] } }, failed: { $sum: { $cond: ['$success', 0, 1] } }, avgResponseTimeMs: { $avg: '$durationMs' } } }]),
        ApiRequestMetric.aggregate([{ $match: match }, { $group: { _id: '$endpoint', requests: { $sum: 1 }, successful: { $sum: { $cond: ['$success', 1, 0] } } } }, { $sort: { requests: -1 } }, { $limit: 100 }]),
        ApiRequestMetric.aggregate([{ $match: match }, { $group: { _id: '$userId', requests: { $sum: 1 }, successful: { $sum: { $cond: ['$success', 1, 0] } }, avgResponseTimeMs: { $avg: '$durationMs' } } }, { $sort: { requests: -1 } }, { $limit: 100 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $project: { requests: 1, successful: 1, avgResponseTimeMs: 1, user: { _id: 1, first_name: 1, last_name: 1, email: 1 } } }]),
        ApiRequestMetric.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, requests: { $sum: 1 }, successful: { $sum: { $cond: ['$success', 1, 0] } } } }, { $sort: { _id: 1 } }]),
        ApiRequestMetric.aggregate([{ $match: match }, { $group: { _id: '$statusCode', requests: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
        ApiRequestMetric.countDocuments(todayMatch),
        includeRows ? [] : ApiRequestMetric.find(match)
            .select('userId endpoint method statusCode success durationMs environment requestId createdAt')
            .populate('userId', 'first_name last_name email')
            .sort({ createdAt: -1 })
            .skip((filters.page - 1) * filters.limit)
            .limit(filters.limit)
            .lean(),
    ]);

    return {
        summary: {
            total: summary[0]?.total || 0,
            successful: summary[0]?.successful || 0,
            failed: summary[0]?.failed || 0,
            avgResponseTimeMs: summary[0] ? Math.round(summary[0].avgResponseTimeMs) : null,
            todayTotal,
        },
        endpoints,
        merchants: merchants.map((row) => ({ ...row, merchant: toSafeUser(row.user), user: undefined })),
        dates,
        statuses,
        rows: rows.map((row) => ({ ...row, merchant: row.userId ? toSafeUser(row.userId) : null, userId: undefined })),
        total: summary[0]?.total || 0,
        page: filters.page,
        limit: filters.limit,
        filters,
    };
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const rowsForCsv = (type, data) => type === 'transactions' ? data.rows.map((row) => [row.transactionId, row.createdAt, row.merchant?.email, row.type, row.category, row.amount, row.status, row.referenceId, row.description]) : type === 'wallets' ? data.rows.map((row) => [row.merchant?.email, row.availableBalance, row.lockedBalance, row.totalPayoutSent, row.totalFunding, row.successfulPayouts, row.failedPayouts, row.updatedAt]) : data.merchants.map((row) => [row.merchant?.email, row.requests, row.successful]);

const exportReport = async (req, res, forcedUserId = null) => {
    const type = req.query.type;
    if (!['transactions', 'wallets', 'api-usage'].includes(type)) return res.status(400).json({ msg: 'Invalid report type' });
    try {
        const data = type === 'transactions' ? await getTransactions(req.query, true, forcedUserId) : type === 'wallets' ? await getWallets(req.query, true, forcedUserId) : await getApiUsage(req.query, true, forcedUserId);
        const format = String(req.query.format || 'csv').toLowerCase();
        const headers = type === 'transactions' ? ['transaction_id', 'date', 'merchant_email', 'type', 'category', 'amount', 'status', 'reference_id', 'description'] : type === 'wallets' ? ['merchant_email', 'available_balance', 'locked_balance', 'total_payout_sent', 'total_funding', 'successful_payouts', 'failed_payouts', 'updated_at'] : ['merchant_email', 'requests', 'successful_requests'];
        if (format === 'csv') {
            const csv = [headers, ...rowsForCsv(type, data)].map((row) => row.map(csvEscape).join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="bluepay_${type}_report.csv"`);
            return res.send(csv);
        }
        if (format !== 'pdf') return res.status(400).json({ msg: 'Format must be csv or pdf' });
        const doc = new PDFDocument({ margin: 36 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="bluepay_${type}_report.pdf"`);
        doc.pipe(res);
        doc.fontSize(18).text('BluePay Report').fontSize(11).text(`Report type: ${type}`).text(`Date range: ${req.query.startDate || 'Any'} to ${req.query.endDate || 'Any'}`).text(`Generated: ${new Date().toISOString()}`).moveDown();
        doc.fontSize(10).text(`Rows: ${data.total}    Total amount: ${data.totalAmount ?? data.summary?.total ?? 'N/A'}`).moveDown();
        doc.fontSize(8).text(headers.join(' | '));
        rowsForCsv(type, data).slice(0, 200).forEach((row) => doc.text(row.map((value) => String(value ?? '')).join(' | ')));
        return doc.end();
    } catch (error) {
        return res.status(error.statusCode || 500).json({ msg: error.message || 'Failed to export report', requestId: req.requestId });
    }
};

const wrap = (handler) => async (req, res) => {
    try { return res.json(await handler(req.query)); } catch (error) { return res.status(error.statusCode || 500).json({ msg: error.message || 'Failed to load report', requestId: req.requestId }); }
};

// Same handler, but resolves the merchant from the authenticated JWT
// (req.user.id) instead of trusting anything the client sends - used by
// the merchant-facing report routes so a merchant only ever sees their own
// transactions/wallet/API-usage data through the exact same query logic
// the admin reports use.
const wrapMerchant = (handler) => async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        return res.json(await handler(req.query, userId));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ msg: error.message || 'Failed to load report', requestId: req.requestId });
    }
};

exports.getTransactions = wrap((query) => getTransactions(query));
exports.getTransactionLogs = wrap((query) => getTransactionLogs(query));
exports.getWallets = wrap((query) => getWallets(query));
exports.getApiUsage = wrap((query) => getApiUsage(query));
exports.exportReport = exportReport;

exports.getMyTransactions = wrapMerchant((query, userId) => getTransactions(query, false, userId));
exports.getMyWallet = wrapMerchant((query, userId) => getWallets(query, false, userId));
exports.getMyApiUsage = wrapMerchant((query, userId) => getApiUsage(query, false, userId));
exports.exportMyReport = (req, res) => exportReport(req, res, req.user.id || req.user._id);