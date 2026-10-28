/**
 * Kotak UAT test harness. Secrets are never printed.
 *
 *   node scripts/kotakUatTest.js offline [kitDir]   # no network: verify crypto vs Kotak samples
 *   node scripts/kotakUatTest.js token              # OAuth only
 *   node scripts/kotakUatTest.js sample             # official sample XML -> encrypt -> UAT
 *   node scripts/kotakUatTest.js dynamic            # BluePay-style test payout -> UAT
 *   node scripts/kotakUatTest.js status <providerReference|messageId>
 *
 * Env: loads apis/.env. `sample` uses Kotak's sample client/product/account
 * (THRSTRAVEL / BBPACKAGE / 08200050000449 from the kit) unless overridden
 * with KOTAK_CLIENT_CODE etc. Sample values are Kotak-owned UAT test data,
 * not BluePay credentials.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const client = require("../services/bank/kotak/kotakClient");
const cfgMod = require("../services/bank/kotak/kotakConfig");

const mode = process.argv[2] || "offline";
const line = (t) => console.log(`\n=== ${t} ===`);
const uniq = () => Date.now().toString(36).toUpperCase().slice(-10);

const secretMask = (s) => (s ? `${s.slice(0, 4)}…(${s.length} chars)` : "MISSING");

const sampleConfig = () => {
    const c = cfgMod.getRawConfig();
    return {
        ...c,
        clientCode: c.clientCode || "THRSTRAVEL",
        msgSource: c.msgSource || c.clientCode || "THRSTRAVEL",
        myProdCode: c.myProdCode || "CMSPAY", // spec 4.3: "In case of UAT, you need to use CMSPAY"
        accountNumber: c.accountNumber || "08200050000449",
    };
};

const printResult = (res) => {
    console.log("HTTP status :", res.status);
    console.log("Headers     :", JSON.stringify(res.headers));
    console.log("Raw body    :", String(res.rawBody).slice(0, 600));
    if (res.xml) console.log("Decrypted   :\n" + res.xml);
    const layer = client.classifyFailure(res);
    console.log("Kotak Request ID:", client.kotakRequestId(res.rawBody) || "n/a");
    console.log("Failure layer:", layer || "none detected at transport level (check StatusCd above)");
};

const withSampleEnv = () => {
    const c = sampleConfig();
    process.env.KOTAK_CLIENT_CODE = c.clientCode;
    process.env.KOTAK_MSG_SOURCE = c.msgSource;
    process.env.KOTAK_MY_PROD_CODE = c.myProdCode;
    process.env.KOTAK_ACCOUNT_NUMBER = c.accountNumber;
};

(async () => {
    if (mode === "offline") {
        line("Offline crypto verification against the official kit samples");
        const secret = process.env.KOTAK_CLIENT_SECRET;
        console.log("Secret:", secretMask(secret));
        const kit = process.argv[3] || "C:/Users/HP/Desktop/CMS Genneric Payments API Kit v1.2.2";
        let ok = true;
        for (const f of ["java encryption Payments call Encrypt Decrypt.txt", "Java encryption Reversal call Encrypt Decrypt.txt"]) {
            const p = path.join(kit, f);
            if (!fs.existsSync(p)) { console.log("skip (not found):", p); continue; }
            const txt = fs.readFileSync(p, "utf8");
            const key = (txt.match(/String key\s*=\s*"([^"]+)"/) || [])[1];
            const cipher = (txt.match(/decrypt\("([A-Za-z0-9+/=]+)"/) || [])[1];
            const plain = client.decryptKotakResponse(cipher, key);
            const isXml = /<[\w-]+:Envelope/.test(plain);
            ok = ok && isXml;
            console.log(`${f}
  Kotak RESPONSE sample decrypts to XML: ${isXml}
  starts: ${plain.slice(0, 70)}…`);
        }
        // Request side: Postman bodies are zero-IV; re-encrypting the decrypted XML must match byte-for-byte.
        const pm = path.join(kit, "CMS Generic API FCMS 4.6 V1.2.postman_collection.json");
        if (fs.existsSync(pm) && process.env.KOTAK_CLIENT_SECRET) {
            const col = JSON.parse(fs.readFileSync(pm, "utf8"));
            const key = process.env.KOTAK_CLIENT_SECRET; // Postman samples were encrypted with the UAT client secret
            for (const item of col.item.filter((i) => /Enc$/.test(i.name))) {
                const body = item.request.body.raw;
                const withIv = Buffer.concat([Buffer.alloc(16), Buffer.from(body, "base64")]).toString("base64");
                const plain = client.decryptKotakResponse(withIv, key).replace(/^[^<]+/, "");
                const same = client.encryptKotakPaymentXml(plain, key) === body;
                ok = ok && same;
                console.log(`Postman request "${item.name}": re-encrypt == Kotak body (byte-exact): ${same}`);
            }
        }
        const s = "<a>é & test</a>";
        console.log("roundtrip:", client.decryptKotakResponse(client.encryptKotakPaymentXml(s, "0".repeat(32)), "0".repeat(32)) === s);

        line("Generated XML from a test payout + validation");
        const cfg = sampleConfig();
        const { xml } = client.buildKotakPaymentXml(
            { providerReference: "BP-KOTAK-test-ABC", amount: 1.23, beneficiaryName: "Test & Co <x>", accountNumber: "12344253", ifscCode: "ICIC0000302", email: "abc@gmail.com", mobile: "9999999999", narration: "BluePay payout" },
            cfg
        );
        console.log(xml);
        console.log("validation:", JSON.stringify(client.validateKotakPaymentXml(xml)));
        process.exit(ok ? 0 : 1);
    }

    if (mode === "token") {
        line("OAuth token");
        const cfg = cfgMod.getRawConfig();
        console.log("token url:", cfg.tokenUrl, "| client_id:", cfg.clientId, "| secret:", secretMask(cfg.clientSecret));
        try {
            const t = await client.getKotakAccessToken({ forceRefresh: true });
            console.log("OK, token received:", t.slice(0, 8) + "…");
        } catch (e) { console.log("FAILED at OAuth:", e.message); process.exit(1); }
        return;
    }

    if (mode === "sample" || mode === "dynamic") {
        withSampleEnv();
        line("Build XML");
        let request;
        if (mode === "sample") {
            // Official sample values from the Postman collection / spec 4.4.
            request = client.createKotakPaymentRequest({
                providerReference: "SAMPLE-" + uniq(),
                amount: 1.23,
                beneficiaryName: "Tejas Swapnil",
                accountNumber: "12344253",
                ifscCode: "ICIC0000302",
                email: "abc@gmail.com",
                mobile: "9999999999",
                address1: "PUNE1", address2: "PUNE2", city: "PUNE", zip: "411047", state: "MH", country: "INDIA",
                // Manager-style: no PayMode/PaymentRef; product BBPACKAGE decides the rail.
                enrichments: [`1900000007~TEST~${new Date().toISOString().slice(0,10).replace(/-/g,"")}~${"1000.00".padStart(25)}~${"1000".padStart(24)}~${"0.00".padStart(24)}`],
            });
        } else {
            request = client.createKotakPaymentRequest({
                providerReference: "BP-KOTAK-dynamic-" + uniq(),
                amount: 150.5,
                beneficiaryName: "BluePay Test Merchant",
                accountNumber: "50100123456789",
                ifscCode: "HDFC0000001",
                narration: "BluePay payout test",
            });
        }
        console.log(request.xml);
        console.log("MessageId:", request.messageId, "| encrypted body length:", request.body.length, "| first 40:", request.body.slice(0, 40) + "…");
        console.log("Request headers (Authorization added at send):", JSON.stringify(request.headers));
        line("Send to " + request.url);
        try {
            const res = await client.sendKotakPayment(request);
            printResult(res);
            console.log("Normalized:", JSON.stringify(client.normalizePaymentResponse(res, { providerReference: "test", messageId: request.messageId }), null, 2));
            console.log("\nStatus lookup key (MessageId):", request.messageId);
        } catch (e) { console.log("FAILED:", e.message); process.exit(1); }
        return;
    }

    if (mode === "status") {
        withSampleEnv();
        const id = process.argv[3];
        const messageId = id && id.startsWith("BP") && id.length === 20 ? id : client.toKotakId(id);
        const xml = client.buildKotakStatusXml({ messageId, instRefNo: messageId });
        console.log(xml);
        const res = await client.sendKotakPayment({
            url: cfgMod.getRawConfig().statusUrl,
            body: client.encryptKotakPaymentXml(xml),
            headers: { SOAPAction: client.SOAP_ACTION_REV, "Content-Type": "application/xml" },
        });
        printResult(res);
        return;
    }
    console.log("unknown mode");
})().catch((e) => { console.error("Script error:", e.message); process.exit(1); });
