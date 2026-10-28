/**
 * Feature flags read once from environment variables, following the same
 * pattern as config/db.js / config/security.js.
 *
 * BULK_PAYOUT_ENABLED gates whether the API server ever loads the Bulk
 * Payout route/controller (and therefore the BullMQ payout-processing
 * queue + its Redis client), and whether the standalone payout worker
 * process starts BullMQ at all. Defaults to ENABLED when unset, so a
 * production environment that has never heard of this flag is completely
 * unaffected - only an explicit `BULK_PAYOUT_ENABLED=false` disables it.
 */
const isBulkPayoutEnabled = () => process.env.BULK_PAYOUT_ENABLED !== 'false';

module.exports = { isBulkPayoutEnabled };
