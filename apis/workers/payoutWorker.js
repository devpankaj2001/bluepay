/**
 * Payout worker (BullMQ).
 *
 * NOT currently wired into the live payout flow: nothing enqueues jobs
 * onto 'payout-processing' anywhere in the codebase today (checked via
 * grep) - payoutController.createPayout still calls Kotak synchronously,
 * inline, wrapped in its own two-phase DB-transaction pattern. This worker
 * is scaffolding for an eventual async path and requires a running Redis
 * (config/redis.js -> REDIS_URL, default redis://127.0.0.1:6379) to start
 * at all.
 *
 * Fixed here:
 *   - wrong require path (services/kotakPayoutService -> services/bank/kotak/kotakPayoutService)
 *   - wrong field names passed into kotakPayoutService.createPayout
 *   - missing wallet/ledger finalization: now reuses payoutController's
 *     applyProviderResult (the exact same function the synchronous flow
 *     uses), instead of leaving a TODO and never releasing/crediting the
 *     wallet for jobs processed this way.
 */

// Must load .env BEFORE reading BULK_PAYOUT_ENABLED below - this file has
// no other require that loads dotenv this early (config/db.js does, but
// that's only required further down, after the flag check).
require('dotenv').config();

const { isBulkPayoutEnabled } = require('../config/featureFlags');

if (!isBulkPayoutEnabled()) {
    console.log('Bulk Payout worker disabled.');
    process.exit(0);
}

// Everything below - including config/redis.js, which opens a Redis
// connection as soon as it is required - only ever loads once the flag
// check above has already passed.
const { Worker } = require('bullmq');
const redis = require('../config/redis');
const { connectDB } = require('../config/db');

const Payout = require('../models/Payout');
const kotakPayoutService = require('../services/bank/kotak/kotakPayoutService');
const { applyProviderResult } = require('../services/payoutEngine');
const { recordPayoutResult } = require('../services/bulkPayoutBatchService');
const logger = require('../utils/logger');

connectDB().catch((error) => {
    logger.error('payoutWorker.databaseConnectionFailed', { error: error.message });
    process.exitCode = 1;
});

const worker = new Worker(
    'payout-processing',
    async (job) => {
        const { payoutId } = job.data;

        const payout = await Payout.findById(payoutId);

        if (!payout) {
            throw new Error('Payout not found');
        }

        // Final status already reached - nothing to do (also guards
        // against a redelivered/duplicate job double-processing this payout).
        if (payout.status === 'success' || payout.status === 'failed') {
            await recordPayoutResult({
                payoutId: payout._id,
                status: payout.status,
                message: payout.providerMessage || payout.remarks || '',
            });
            return { skipped: true, status: payout.status };
        }

        logger.info('payoutWorker.processing', { payoutId, providerReference: payout.providerReference });

        let providerResult;
        try {
            providerResult = await kotakPayoutService.createPayout({
                payoutId: payout._id.toString(),
                providerReference: payout.providerReference,
                amount: payout.amount,
                beneficiaryName: payout.beneficiary_name,
                accountNumber: payout.account_number,
                ifscCode: payout.ifsc_code,
                bankName: payout.bank_name,
            });
        } catch (error) {
            logger.error('payoutWorker.providerUnknown', {
                payoutId: payout._id.toString(),
                error: error.message,
            });
            providerResult = {
                status: 'UNKNOWN',
                providerTransactionId: null,
                providerReference: payout.providerReference,
                message: 'Payout could not be confirmed with the provider; pending reconciliation',
            };
        }

        const updated = await applyProviderResult({ payout, providerResult });
        await recordPayoutResult({
            payoutId: updated._id,
            status: updated.status,
            message: updated.providerMessage || updated.remarks || '',
        });

        logger.info('payoutWorker.result', { payoutId, status: updated.status });

        return { status: updated.status };
    },
    {
        connection: redis,
        concurrency: 5,
    }
);

worker.on('completed', (job) => {
    console.log(`Payout job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
    console.error(`Payout job failed: ${job?.id}`, err.message);
});

console.log('Payout worker started');

module.exports = worker;
