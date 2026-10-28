const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB, ensureDatabaseReady, getConnectionState, READY_TIMEOUT_MS } = require('./config/db');
const requestSecurity = require('./middleware/requestSecurity');
const { isBulkPayoutEnabled } = require('./config/featureFlags');

const ledgerRoutes = require("./routes/ledgerRoutes");

const app = express();
const port = process.env.PORT || 1977;

// Middleware
app.use(cors());
app.use(express.json());
// CCAvenue posts its payment response as application/x-www-form-urlencoded.
app.use(express.urlencoded({ extended: true }));
app.use('/uploads/kyc', (req, res) => res.status(403).json({ msg: 'KYC documents are private' }));
app.use('/uploads', require('express').static('uploads')); // Serve profile images and receipts

// Assigns req.requestId (used for support/debugging correlation and by
// Activity Logs' API_ACTIVITY records) - must run before any route so every
// request has one, including ones that fail before reaching a controller.
app.use(requestSecurity(30000));

// Start one shared connection attempt. Requests use ensureDatabaseReady below
// while an initial connection or bounded retry is in progress.
connectDB().catch(() => {});

// app.listen is deferred with the async wrapper further down so the server
// only starts accepting connections once MongoDB is ready (bounded by
// READY_TIMEOUT_MS) - this is what closes the window where a request could
// land while readyState is still 2 (connecting) and get a 503.

// Wait briefly through connecting/reconnecting states instead of rejecting
// every request while Mongoose is legitimately moving toward readyState=1.
app.use(async (req, res, next) => {
    // Exempt health check endpoints
    if (req.path === '/' || req.path === '/api/db-check') {
        return next();
    }
    try {
        await ensureDatabaseReady(READY_TIMEOUT_MS);
        return next();
    } catch (error) {
        return res.status(503).json({
            msg: 'Database connection is currently unavailable. Please wait a moment while connection is restored.',
            ...(req.requestId ? { requestId: req.requestId } : {}),
        });
    }
});

// Routes
app.use("/ledger", ledgerRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/v1', require('./routes/merchantApiRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/funds', require('./routes/fundRoutes'));
// Bulk Payout is gated behind BULK_PAYOUT_ENABLED: when disabled, the real
// route file (which transitively requires queues/payoutQueue.js ->
// config/redis.js, eagerly opening a Redis connection) is never required
// at all - not just unreachable, genuinely never loaded into this process.
if (isBulkPayoutEnabled()) {
    app.use('/api/payouts/bulk', require('./routes/bulkPayoutRoutes'));
} else {
    console.log('Bulk Payout is disabled (BULK_PAYOUT_ENABLED=false) - queue/Redis not initialized.');
    app.use('/api/payouts/bulk', (req, res) => {
        res.status(503).json({ msg: 'Bulk Payout is temporarily disabled.' });
    });
}
app.use('/api/payouts/scheduled', require('./routes/scheduledPayoutRoutes'));
app.use('/api/payouts', require('./routes/payoutRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/account', require('./routes/accountRoutes'));
app.use('/api/kyc', require('./routes/kycRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/admin/support', require('./routes/adminSupportRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/developer', require('./routes/developerRoutes'));
app.use('/api/admin/developer', require('./routes/adminDeveloperRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/admin/webhooks', require('./routes/adminWebhookRoutes'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Database Connection Check Endpoint
app.get('/api/db-check', (req, res) => {
    const state = getConnectionState();

    if (state === 1) {
        res.status(200).json({
            status: 'success',
            message: 'Database is connected',
            state: 'connected'
        });
    } else {
        res.status(500).json({
            status: 'error',
            message: 'Database is NOT connected',
            state: state === 0 ? 'disconnected' :
                state === 2 ? 'connecting' : 'disconnecting'
        });
    }
});

ensureDatabaseReady(READY_TIMEOUT_MS)
    .catch((error) => {
        console.error(`Initial MongoDB connection did not complete within ${READY_TIMEOUT_MS}ms (${error.message}); starting server anyway - the readiness middleware above and the existing retry/reconnect logic in config/db.js will keep trying.`);
    })
    .finally(() => {
        app.listen(port, () => {
            console.log(`Server is running on port: ${port}`);
        });
    });

