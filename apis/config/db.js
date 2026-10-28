const mongoose = require('mongoose');
require('dotenv').config({ quiet: true });

const CONNECT_TIMEOUT_MS = Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 5000);
const RETRY_DELAY_MS = Number(process.env.MONGO_RETRY_DELAY_MS || 5000);
const DEFAULT_READY_TIMEOUT_MS = Number(process.env.MONGO_READY_TIMEOUT_MS || 10000);

let connectionAttempt = null;
let retryTimer = null;

const logConnectionFailure = (error) => {
    const code = error?.code || error?.name || 'connection_error';
    console.error(`MongoDB connection attempt failed (${code}).`);
};

const scheduleRetry = () => {
    if (retryTimer || mongoose.connection.readyState === 1) return;

    retryTimer = setTimeout(() => {
        retryTimer = null;
        connectDB().catch(() => {
            // connectDB schedules the next bounded retry.
        });
    }, RETRY_DELAY_MS);
};

const connectDB = () => {
    if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
    if (connectionAttempt) return connectionAttempt;

    if (!process.env.MONGO_URI) {
        const error = new Error('MONGO_URI is not configured');
        scheduleRetry();
        return Promise.reject(error);
    }

    if (mongoose.connection.readyState === 2) {
        connectionAttempt = new Promise((resolve, reject) => {
            const onConnected = () => { cleanup(); resolve(mongoose.connection); };
            const onError = (error) => { cleanup(); reject(error); };
            const cleanup = () => {
                mongoose.connection.off('connected', onConnected);
                mongoose.connection.off('error', onError);
            };
            mongoose.connection.once('connected', onConnected);
            mongoose.connection.once('error', onError);
        }).finally(() => { connectionAttempt = null; });
        return connectionAttempt;
    }

    connectionAttempt = mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    })
        .then(() => {
            if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
            if (process.env.MONGO_QUIET !== '1') console.log('MongoDB Connected Successfully');
            return mongoose.connection;
        })
        .catch((error) => {
            logConnectionFailure(error);
            scheduleRetry();
            throw error;
        })
        .finally(() => { connectionAttempt = null; });

    return connectionAttempt;
};

const ensureDatabaseReady = async (timeoutMs = DEFAULT_READY_TIMEOUT_MS) => {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;

    while (Date.now() < deadline) {
        if (mongoose.connection.readyState === 1) return mongoose.connection;
        try { await connectDB(); } catch (error) { lastError = error; }
        if (mongoose.connection.readyState === 1) return mongoose.connection;

        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(250, remaining)));
    }

    const error = new Error('Database is not ready');
    error.code = 'DATABASE_UNAVAILABLE';
    error.cause = lastError;
    throw error;
};

mongoose.connection.on('connected', () => {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
});
mongoose.connection.on('disconnected', scheduleRetry);
mongoose.connection.on('error', logConnectionFailure);

module.exports = {
    connectDB,
    ensureDatabaseReady,
    getConnectionState: () => mongoose.connection.readyState,
    READY_TIMEOUT_MS: DEFAULT_READY_TIMEOUT_MS,
};