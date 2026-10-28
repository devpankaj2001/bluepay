/**
 * Mock Kotak adapter.
 *
 * Stands in for the real Kotak API so the payout pipeline (idempotency ->
 * wallet reservation -> provider call -> ledger/wallet finalization ->
 * retry -> status inquiry) can be built and tested end-to-end without real
 * money or real Kotak credentials. Never used when PAYOUT_PROVIDER_MODE is
 * "live" - see kotakClient.js.
 *
 * Deterministic test scenarios are triggered by a keyword anywhere in
 * beneficiary_name (case-insensitive), so a caller can exercise every
 * required case (see Step 10 requirement 17) just by choosing a name:
 *
 *   (no keyword)      -> SUCCESS
 *   "MOCK_FAIL"        -> FAILED (provider rejects the transfer)
 *   "MOCK_PROCESSING"  -> PROCESSING (provider accepted, not yet settled)
 *   "MOCK_UNKNOWN"     -> UNKNOWN (provider returns an ambiguous status)
 *   "MOCK_TIMEOUT"     -> simulates a network timeout (throws a timeout error)
 *   "MOCK_DUPLICATE"   -> simulates the provider rejecting a re-used reference
 *
 * State for PROCESSING/UNKNOWN payouts is kept in-memory (per reference) so
 * a later status-inquiry call can resolve to a final status, letting the
 * reconciliation/status-check flow be exercised too.
 */

const providerResponse = require("../providerResponse");

// referenceId -> { scenario, providerTransactionId, resolvedStatus, calls }
const ledger = new Map();

const genProviderTxnId = () =>
    `KMOCK${Date.now()}${Math.floor(Math.random() * 1e6)}`;

const detectScenario = (beneficiaryName = "") => {
    const name = String(beneficiaryName).toUpperCase();

    if (name.includes("MOCK_FAIL")) return "FAIL";
    if (name.includes("MOCK_PROCESSING")) return "PROCESSING";
    if (name.includes("MOCK_UNKNOWN")) return "UNKNOWN";
    if (name.includes("MOCK_TIMEOUT")) return "TIMEOUT";
    if (name.includes("MOCK_DUPLICATE")) return "DUPLICATE";
    return "SUCCESS";
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates submitting a payout to Kotak.
 *
 * @param {object} params
 * @param {string} params.providerReference - unique BluePay-generated
 *   reference. Reusing this on retry is what makes retries safe; the mock
 *   honors that by returning the same recorded outcome for a reference it
 *   has already seen (never creates a second "transfer").
 * @param {number} params.amount
 * @param {string} params.beneficiaryName
 */
const createPayout = async ({ providerReference, amount, beneficiaryName }) => {
    if (!providerReference) {
        throw new Error("providerReference is required");
    }

    // Idempotent retry: same reference already submitted -> return the
    // recorded outcome instead of creating a new "transfer".
    if (ledger.has(providerReference)) {
        const existing = ledger.get(providerReference);
        existing.calls += 1;
        return buildResponse(existing);
    }

    const scenario = detectScenario(beneficiaryName);
    const providerTransactionId = genProviderTxnId();

    await sleep(50); // simulate network latency

    if (scenario === "TIMEOUT") {
        // Do NOT record an outcome - a real timeout means BluePay does not
        // know what happened on Kotak's side yet. This is what forces the
        // caller into UNKNOWN/PROCESSING rather than FAILED.
        const err = new Error("Kotak request timed out");
        err.code = "ETIMEDOUT";
        err.isTimeout = true;
        throw err;
    }

    if (scenario === "DUPLICATE") {
        const err = new Error("Kotak rejected duplicate reference/transaction id");
        err.code = "DUPLICATE_REFERENCE";
        err.isDuplicate = true;
        throw err;
    }

    const record = {
        scenario,
        providerReference,
        providerTransactionId,
        resolvedStatus:
            scenario === "PROCESSING" || scenario === "UNKNOWN"
                ? null // not yet resolved - status inquiry will resolve it
                : scenario === "FAIL"
                    ? "FAILED"
                    : "SUCCESS",
        pendingScenario: scenario === "PROCESSING" || scenario === "UNKNOWN" ? scenario : null,
        calls: 1,
    };

    ledger.set(providerReference, record);

    return buildResponse(record);
};

/**
 * Simulates a Kotak status-inquiry call for a previously submitted payout.
 * PROCESSING resolves to SUCCESS after being checked once (simulating the
 * provider settling async); UNKNOWN stays UNKNOWN until manually resolved
 * via resolveForTesting (below), matching a real "still can't confirm"
 * scenario a reconciliation job would keep polling.
 */
const checkStatus = async ({ providerReference }) => {
    const record = ledger.get(providerReference);

    if (!record) {
        return providerResponse.unknown({
            providerReference,
            message: "No record found for this reference on the provider side",
        });
    }

    await sleep(30);

    if (record.pendingScenario === "PROCESSING") {
        // First inquiry resolves it, like an async transfer settling.
        record.resolvedStatus = "SUCCESS";
        record.pendingScenario = null;
    }

    return buildResponse(record);
};

const buildResponse = (record) => {
    const { providerTransactionId, providerReference, resolvedStatus } = record;

    if (resolvedStatus === "SUCCESS") {
        return providerResponse.success({
            providerTransactionId,
            providerReference,
            message: "Payout processed successfully by Kotak (mock)",
        });
    }

    if (resolvedStatus === "FAILED") {
        return providerResponse.failed({
            providerTransactionId,
            providerReference,
            message: "Beneficiary account rejected the transfer (mock)",
            providerResponseCode: "MOCK_BENEFICIARY_ERROR",
        });
    }

    if (record.pendingScenario === "UNKNOWN") {
        return providerResponse.unknown({
            providerTransactionId,
            providerReference,
            message: "Provider status could not be confirmed (mock)",
        });
    }

    return providerResponse.processing({
        providerTransactionId,
        providerReference,
        message: "Payout accepted by Kotak, awaiting settlement (mock)",
    });
};

/**
 * Test-only helper: force an UNKNOWN reference to resolve, e.g. to test the
 * "reconciliation eventually confirms it" path.
 */
const resolveForTesting = (providerReference, status) => {
    const record = ledger.get(providerReference);
    if (!record) return false;
    record.resolvedStatus = status;
    record.pendingScenario = null;
    return true;
};

const _clearForTesting = () => ledger.clear();

module.exports = {
    createPayout,
    checkStatus,
    resolveForTesting,
    _clearForTesting,
};
