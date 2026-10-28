/**
 * Manual smoke test for the Kotak mock adapter / kotakPayoutService.
 *
 * Exercises every scenario from Step 10 requirement 17 without touching
 * the database, the HTTP server, or any real bank credentials.
 *
 * Run with: node scripts/testKotakMock.js
 * (from the apis/ directory; does not require MONGO_URI or a running server)
 */

process.env.PAYOUT_PROVIDER_MODE = "mock";

const kotakPayoutService = require("../services/bank/kotak/kotakPayoutService");
const mockAdapter = require("../services/bank/kotak/mockKotakAdapter");

const line = () => console.log("-".repeat(70));

const run = async (label, fn) => {
    line();
    console.log(`SCENARIO: ${label}`);
    try {
        const result = await fn();
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.log(`threw: ${error.name}: ${error.message}`);
    }
};

const payout = (beneficiary_name) => ({
    payoutId: `test-${beneficiary_name.toLowerCase()}`,
    providerReference: kotakPayoutService.generateProviderReference(beneficiary_name),
    amount: 1000,
    beneficiaryName: beneficiary_name,
    accountNumber: "1234567890",
    ifscCode: "KKBK0000958",
    bankName: "Kotak Mahindra Bank",
});

(async () => {
    mockAdapter._clearForTesting();

    // 1. SUCCESS
    await run("SUCCESS", () => kotakPayoutService.createPayout(payout("Ramesh Kumar")));

    // 2. FAILED
    await run("FAILED", () => kotakPayoutService.createPayout(payout("MOCK_FAIL Beneficiary")));

    // 3. PROCESSING (then resolved via a follow-up status inquiry)
    {
        const p = payout("MOCK_PROCESSING Beneficiary");
        await run("PROCESSING (initial submit)", () => kotakPayoutService.createPayout(p));
        await run("PROCESSING -> resolved via status inquiry", () =>
            kotakPayoutService.checkStatus({
                payoutId: p.payoutId,
                providerReference: p.providerReference,
            })
        );
    }

    // 4. TIMEOUT -> must normalize to UNKNOWN, never FAILED
    await run("TIMEOUT (normalizes to UNKNOWN)", () => kotakPayoutService.createPayout(payout("MOCK_TIMEOUT Beneficiary")));

    // 5. UNKNOWN
    await run("UNKNOWN", () => kotakPayoutService.createPayout(payout("MOCK_UNKNOWN Beneficiary")));

    // 6. DUPLICATE REQUEST -> provider says reference already used; must not
    // be treated as a fresh failure or trigger a second transfer attempt.
    await run("DUPLICATE REQUEST", () => kotakPayoutService.createPayout(payout("MOCK_DUPLICATE Beneficiary")));

    // 7. STATUS INQUIRY on an unknown/unrecognized reference
    await run("STATUS INQUIRY (unrecognized reference)", () =>
        kotakPayoutService.checkStatus({ payoutId: "none", providerReference: "NEVER-SUBMITTED" })
    );

    // 8. RETRY -> resubmitting with the SAME providerReference must not
    // create a second "transfer" (the mock records only one outcome per
    // reference no matter how many times createPayout is called with it).
    {
        const p = payout("Suresh Retry Test");
        const first = await kotakPayoutService.createPayout(p);
        const second = await kotakPayoutService.createPayout(p); // same providerReference
        line();
        console.log("SCENARIO: RETRY (same providerReference reused)");
        console.log("first call :", JSON.stringify(first));
        console.log("second call:", JSON.stringify(second));
        console.log(
            "same providerTransactionId:",
            first.providerTransactionId === second.providerTransactionId
        );
    }

    line();
    console.log("Done.");
})();
