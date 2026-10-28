import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, Check, Copy, Eye, EyeOff, Key, LockKeyhole, RefreshCw, ShieldCheck, Terminal, Trash2, Webhook } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { API_BASE_URL } from '../api/config';

const API_BASE = API_BASE_URL;
const PAYOUT_ENDPOINT = '/v1/payouts';

const CopyButton = ({ value }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success('Copied to clipboard');
        window.setTimeout(() => setCopied(false), 1600);
    };

    return (
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50" title="Copy value">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
};

const CodeBlock = ({ value }) => (
    <div className="relative rounded-xl bg-slate-950 p-4 pr-16 text-xs leading-6 text-slate-200">
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono">{value}</pre>
        <div className="absolute right-3 top-3"><CopyButton value={value} /></div>
    </div>
);

const MERCHANT_API_BASE = `${API_BASE}/v1`;

const DOC_NAV = [
        { id: 'authentication', label: 'Authentication' },
        { id: 'create-payout', label: 'Create Payout' },
        { id: 'payout-status', label: 'Payout Status' },
        { id: 'list-payouts', label: 'List Payouts' },
        { id: 'wallet-balance', label: 'Wallet Balance' },
        { id: 'errors', label: 'Errors & Idempotency' },
        { id: 'webhooks', label: 'Webhooks' },
];

const API_HEADERS = `x-api-key: bp_live_YOUR_API_KEY
x-api-secret: bps_YOUR_API_SECRET
x-bluepay-environment: live
Content-Type: application/json`;

const CREATE_PAYOUT_CURL = `curl -X POST ${MERCHANT_API_BASE}/payouts \\
    -H "x-api-key: bp_live_YOUR_API_KEY" \\
    -H "x-api-secret: bps_YOUR_API_SECRET" \\
    -H "x-bluepay-environment: live" \\
    -H "Content-Type: application/json" \\
    -H "Idempotency-Key: payout-order-1029" \\
    -d '{
        "amount": 5000,
        "beneficiary_name": "Arjun Sharma",
        "account_number": "9876543210",
        "ifsc_code": "HDFC0001234",
        "bank_name": "HDFC Bank"
    }'`;

const CREATE_PAYOUT_JS = `const response = await fetch('${MERCHANT_API_BASE}/payouts', {
    method: 'POST',
    headers: {
        'x-api-key': process.env.BLUEPAY_API_KEY,
        'x-api-secret': process.env.BLUEPAY_API_SECRET,
        'x-bluepay-environment': 'live',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'payout-order-1029'
    },
    body: JSON.stringify({
        amount: 5000,
        beneficiary_name: 'Arjun Sharma',
        account_number: '9876543210',
        ifsc_code: 'HDFC0001234',
        bank_name: 'HDFC Bank'
    })
});
const result = await response.json();`;

const CREATE_PAYOUT_PYTHON = `import os
import requests

response = requests.post(
        "${MERCHANT_API_BASE}/payouts",
        headers={
                "x-api-key": os.environ["BLUEPAY_API_KEY"],
                "x-api-secret": os.environ["BLUEPAY_API_SECRET"],
                "x-bluepay-environment": "live",
                "Content-Type": "application/json",
                "Idempotency-Key": "payout-order-1029",
        },
        json={
                "amount": 5000,
                "beneficiary_name": "Arjun Sharma",
                "account_number": "9876543210",
                "ifsc_code": "HDFC0001234",
                "bank_name": "HDFC Bank",
        },
)
result = response.json()`;

const ApiDocumentation = () => {
        const [activeSection, setActiveSection] = useState('authentication');

        return (
                <div className="space-y-6 pb-12">
                        <div>
                                <div className="flex items-center gap-2 text-blue-600"><BookOpen className="h-6 w-6" /><span className="text-xs font-bold uppercase tracking-wider">Merchant API reference</span></div>
                                <h1 className="mt-2 text-2xl font-black text-gray-900 sm:text-3xl">API Documentation</h1>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">The reference below describes the external merchant API currently served by BluePay. Keep API secrets on your backend and never place them in browser code.</p>
                        </div>

                        <div className="flex flex-col gap-5 lg:flex-row">
                                <nav className="w-full shrink-0 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm lg:sticky lg:top-4 lg:h-fit lg:w-56">
                                        {DOC_NAV.map((item) => <button key={item.id} type="button" onClick={() => setActiveSection(item.id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${activeSection === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>{item.label}</button>)}
                                </nav>

                                <div className="min-w-0 flex-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
                                        {activeSection === 'authentication' && <DocumentationAuthentication />}
                                        {activeSection === 'create-payout' && <DocumentationCreatePayout />}
                                        {activeSection === 'payout-status' && <DocumentationPayoutStatus />}
                                        {activeSection === 'list-payouts' && <DocumentationListPayouts />}
                                        {activeSection === 'wallet-balance' && <DocumentationWalletBalance />}
                                        {activeSection === 'errors' && <DocumentationErrors />}
                                        {activeSection === 'webhooks' && <DocumentationWebhooks />}
                                </div>
                        </div>
                </div>
        );
};

const DocumentationHeading = ({ title, children }) => <div className="mb-5"><h2 className="text-xl font-black text-gray-900">{title}</h2><p className="mt-1 text-sm leading-6 text-gray-600">{children}</p></div>;
const DocumentationLabel = ({ children }) => <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-gray-400">{children}</h3>;
const DocumentationTable = ({ rows }) => <div className="overflow-x-auto rounded-xl border border-gray-100"><table className="min-w-full divide-y divide-gray-100 text-left text-sm"><tbody className="divide-y divide-gray-100">{rows.map(([label, value]) => <tr key={label}><th className="whitespace-nowrap bg-gray-50 px-4 py-3 font-semibold text-gray-600">{label}</th><td className="px-4 py-3 text-gray-600">{value}</td></tr>)}</tbody></table></div>;

const DocumentationAuthentication = () => <>
        <DocumentationHeading title="Authentication">Authenticate external merchant requests with the API key and secret generated for the matching environment. Dashboard JWT tokens are not accepted by these routes.</DocumentationHeading>
        <DocumentationLabel>Base URLs</DocumentationLabel>
        <DocumentationTable rows={[
                ['Test', `${MERCHANT_API_BASE} with x-bluepay-environment: test`],
                ['Live', `${MERCHANT_API_BASE} with x-bluepay-environment: live`],
                ['Configuration', 'BluePay currently uses one configured API host; no separate hosted test hostname is configured.'],
        ]} />
        <DocumentationLabel>Required headers</DocumentationLabel>
        <CodeBlock value={API_HEADERS} />
        <DocumentationLabel>Scopes</DocumentationLabel>
        <DocumentationTable rows={[
                ['payouts:write', 'Create a payout.'],
                ['payouts:read', 'List payouts, retrieve a payout, and request payout status inquiry.'],
                ['wallet:read', 'Read the merchant wallet balance overview.'],
        ]} />
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Send credentials only from a server-side integration. Never expose the secret in frontend JavaScript, source control, or logs.</div>
        <DocumentationLabel>Authentication errors</DocumentationLabel>
        <DocumentationTable rows={[
                ['401', 'Missing, invalid, revoked, inactive, or environment-mismatched credentials. Response: { "msg": "Invalid API credentials" }.'],
                ['403', 'The credential is valid but does not include the required scope. Response: { "msg": "Insufficient API permission" }.'],
        ]} />
</>;

const DocumentationCreatePayout = () => <>
        <DocumentationHeading title="Create Payout">Create a merchant payout through the same payout engine used by the dashboard. The request reserves wallet funds and submits the payout to the configured provider.</DocumentationHeading>
        <DocumentationTable rows={[
                ['Method', 'POST'],
                ['Path', `${MERCHANT_API_BASE}/payouts`],
                ['Scope', 'payouts:write'],
                ['Idempotency', 'Required: Idempotency-Key, 8-200 characters using letters, numbers, _, -, :, or .'],
        ]} />
        <DocumentationLabel>Request body</DocumentationLabel>
        <DocumentationTable rows={[
                ['amount', 'Required. Positive number.'],
                ['beneficiary_name', 'Required. Non-empty string.'],
                ['account_number', 'Required. Non-empty string.'],
                ['ifsc_code', 'Required. Non-empty string.'],
                ['bank_name', 'Optional string.'],
        ]} />
        <DocumentationLabel>cURL</DocumentationLabel><CodeBlock value={CREATE_PAYOUT_CURL} />
        <DocumentationLabel>JavaScript / Node.js</DocumentationLabel><CodeBlock value={CREATE_PAYOUT_JS} />
        <DocumentationLabel>Python</DocumentationLabel><CodeBlock value={CREATE_PAYOUT_PYTHON} />
        <DocumentationLabel>Responses</DocumentationLabel>
        <CodeBlock value={`201 Created\n{
    "success": true,
    "msg": "Payout created",
    "payout": { "_id": "...", "amount": 5000, "status": "processing" },
    "wallet": { "availableBalance": 95000, "lockedBalance": 5000 },
    "ledger": { "...": "..." }
}

201 Created with provider uncertainty\n{
    "success": true,
    "msg": "Payout could not be confirmed with the provider; pending reconciliation",
    "payout": { "status": "unknown" }
}

201 Created with provider failure\n{
    "success": false,
    "msg": "Provider failure message",
    "payout": { "status": "failed" }
}`}/>
        <p className="mt-3 text-xs leading-5 text-gray-500">Validation failures and insufficient balance return 400. Unexpected server errors return 500. The response object is produced by the existing payout engine/controller.</p>
</>;

const DocumentationPayoutStatus = () => <>
        <DocumentationHeading title="Payout Status">Request a provider status inquiry for one of your own payouts. This endpoint never accepts a payout belonging to another merchant.</DocumentationHeading>
        <DocumentationTable rows={[
                ['Method', 'GET'],
                ['Path', `${MERCHANT_API_BASE}/payouts/{payoutId}/status`],
                ['Scope', 'payouts:read'],
                ['Required identifier', 'payoutId is the payout MongoDB _id returned by Create Payout or List Payouts.'],
        ]} />
        <DocumentationLabel>Response</DocumentationLabel>
        <CodeBlock value={`200 OK\n{
    "success": true,
    "msg": "Status inquiry complete",
    "payout": {
        "_id": "...",
        "status": "processing",
        "providerStatus": "PROCESSING",
        "providerTransactionId": "...",
        "lastStatusCheckedAt": "..."
    },
    "providerResult": { "status": "PROCESSING" }
}`}/>
        <p className="mt-3 text-sm text-gray-600">Possible payout statuses are <code>pending</code>, <code>processing</code>, <code>success</code>, <code>failed</code>, and <code>unknown</code>. A missing payout returns 404. A payout without a provider reference returns 400. If live provider status inquiry is not configured, the endpoint returns 503.</p>
</>;

const DocumentationListPayouts = () => <>
        <DocumentationHeading title="List Payouts">List only the authenticated merchant's payouts with pagination and optional filters.</DocumentationHeading>
        <DocumentationTable rows={[
                ['Method', 'GET'],
                ['Path', `${MERCHANT_API_BASE}/payouts`],
                ['Scope', 'payouts:read'],
                ['Default pagination', 'page=1, limit=20; limit is capped at 100.'],
        ]} />
        <DocumentationLabel>Query parameters</DocumentationLabel>
        <DocumentationTable rows={[
                ['page, limit', 'Pagination numbers.'],
                ['status', 'all, pending, processing, success, failed, or unknown.'],
                ['search', 'Matches beneficiary_name, txn_id, providerTransactionId, providerReference, or a 24-character payout _id.'],
                ['beneficiary', 'Case-insensitive beneficiary name match.'],
                ['dateFrom, dateTo', 'ISO date filters; dateTo includes the full day.'],
                ['amountMin, amountMax', 'Numeric amount range filters.'],
        ]} />
        <DocumentationLabel>Response</DocumentationLabel>
        <CodeBlock value={`200 OK\n{
    "success": true,
    "payouts": [{ "_id": "...", "amount": 5000, "status": "success", "account_number": "XXXX3210" }],
    "total": 1,
    "page": 1,
    "pages": 1,
    "limit": 20
}`}/>
</>;

const DocumentationWalletBalance = () => <>
        <DocumentationHeading title="Wallet Balance">Read the authenticated merchant wallet overview. The endpoint returns balances together with wallet metrics and recent records because it reuses the existing wallet overview controller.</DocumentationHeading>
        <DocumentationTable rows={[
                ['Method', 'GET'],
                ['Path', `${MERCHANT_API_BASE}/wallet/balance`],
                ['Scope', 'wallet:read'],
                ['Query parameters', 'Optional startDate and endDate ISO date filters for the overview data.'],
        ]} />
        <DocumentationLabel>Response</DocumentationLabel>
        <CodeBlock value={`200 OK\n{
    "success": true,
    "wallet": {
        "availableBalance": 95000,
        "lockedBalance": 5000,
        "totalPayoutSent": 250000,
        "totalFailed": 0
    },
    "metrics": {
        "totalCredit": 300000,
        "totalDebit": 250000,
        "todayCredit": 0,
        "todayDebit": 5000,
        "pendingFunds": 0
    },
    "transactions": [],
    "fundRequests": [],
    "payouts": []
}`}/>
</>;

const DocumentationErrors = () => <>
        <DocumentationHeading title="Errors and Idempotency">All merchant API errors are JSON responses. Use the HTTP status and msg field as the stable handling contract; do not rely on provider-specific text.</DocumentationHeading>
        <DocumentationLabel>Supported responses</DocumentationLabel>
        <DocumentationTable rows={[
                ['400', 'Invalid payout fields, insufficient balance, invalid status filter, invalid idempotency key, or payout has no provider reference.'],
                ['401', 'Missing or invalid API credentials, including revoked, inactive, or wrong-environment credentials.'],
                ['403', 'Credential lacks the route scope.'],
                ['404', 'Payout does not exist or does not belong to the authenticated merchant.'],
                ['409', 'Idempotency-Key is already processing, was used with a different payload, or duplicate request conflict.'],
                ['500', 'Unexpected BluePay or database error.'],
                ['503', 'Provider status inquiry is unavailable because the live provider operation is not configured.'],
        ]} />
        <p className="mt-3 text-xs text-gray-500">No 429 rate-limit response is currently implemented in the backend, so it is intentionally not documented here.</p>
        <DocumentationLabel>Idempotency-Key behavior</DocumentationLabel>
        <p className="text-sm leading-6 text-gray-600">Create Payout requires an Idempotency-Key. The key is stored per merchant and payout operation for 24 hours. Retrying the same key with the same request body replays the stored response after success. Reusing it with a different body returns 409. A request still processing returns 409, and a failed attempt can be safely reclaimed and retried with the same key.</p>
</>;

const DocumentationWebhooks = () => <>
    <DocumentationHeading title="Webhooks">Configure a Test or Live endpoint in Developers → Webhooks to receive signed payout status events asynchronously.</DocumentationHeading>
    <DocumentationLabel>Supported events</DocumentationLabel>
    <DocumentationTable rows={[
        ['payout.processing', 'Payout entered processing state.'],
        ['payout.success', 'Payout completed successfully.'],
        ['payout.failed', 'Payout failed and funds were released by the existing payout flow.'],
        ['payout.unknown', 'Provider result could not be confirmed; reconciliation may resolve it later.'],
    ]} />
    <DocumentationLabel>Payload</DocumentationLabel>
    <CodeBlock value={`{
  "eventId": "evt_...",
  "event": "payout.success",
  "timestamp": "2026-09-16T12:00:00.000Z",
  "environment": "live",
  "data": { "payoutId": "...", "amount": 5000, "status": "success", "accountNumber": "XXXX3210", "transactionId": "...", "providerReference": "..." }
}`}/>
    <DocumentationLabel>Signature verification</DocumentationLabel>
    <p className="text-sm leading-6 text-gray-600">BluePay signs the exact raw JSON bytes with HMAC-SHA256. The header is <code>X-BluePay-Signature: t=UNIX_SECONDS,v1=HEX_HMAC</code>. Capture the raw body before JSON parsing and compare the computed digest using a constant-time comparison.</p>
    <DocumentationLabel>Node.js</DocumentationLabel>
    <CodeBlock value={`import crypto from 'node:crypto';
const rawBody = req.rawBody;
const header = req.get('X-BluePay-Signature') || '';
const match = header.match(/^t=(\\d+),v1=([a-f0-9]+)$/);
const expected = crypto.createHmac('sha256', process.env.BLUEPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
if (!match || !crypto.timingSafeEqual(Buffer.from(match[2], 'hex'), Buffer.from(expected, 'hex'))) return res.sendStatus(401);`}/>
    <DocumentationLabel>Python</DocumentationLabel>
    <CodeBlock value={`import os
import hashlib
import hmac
raw_body = request.get_data()
parts = dict(item.split('=', 1) for item in request.headers.get('X-BluePay-Signature', '').split(',') if '=' in item)
expected = hmac.new(os.environ['BLUEPAY_WEBHOOK_SECRET'].encode(), raw_body, hashlib.sha256).hexdigest()
if not hmac.compare_digest(parts.get('v1', ''), expected): return ('invalid signature', 401)`}/>
    <DocumentationLabel>Delivery, retries, and duplicates</DocumentationLabel>
    <p className="text-sm leading-6 text-gray-600">Delivery is asynchronous and does not affect payout, wallet, or ledger state. Attempts time out after 10 seconds. Network errors, timeouts, redirects, and 5xx responses retry with bounded backoff for up to six attempts; normal 4xx responses fail without automatic retry. Process events idempotently using <code>eventId</code>. Test endpoints receive only Test events and Live endpoints receive only Live events.</p>
</>;

const WEBHOOK_EVENTS = ['payout.processing', 'payout.success', 'payout.failed', 'payout.unknown'];

const WebhooksSection = () => {
    const [endpoints, setEndpoints] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ url: '', environment: 'test', events: ['payout.processing', 'payout.success', 'payout.failed', 'payout.unknown'] });
    const [secret, setSecret] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const [{ data: endpointData }, { data: deliveryData }] = await Promise.all([
                apiClient.get('/webhooks/endpoints'),
                apiClient.get('/webhooks/deliveries'),
            ]);
            setEndpoints(endpointData.endpoints || []);
            setDeliveries(deliveryData.deliveries || []);
        } catch (error) {
            // StrictMode double-invokes this effect in dev; apiClient's GET
            // dedup then aborts the first identical in-flight request, and
            // that abort must not be shown as a real load failure.
            if (error?.isCanceled) return;
            toast.error(error.response?.data?.msg || 'Unable to load webhooks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const create = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const { data } = await apiClient.post('/webhooks/endpoints', form);
            setEndpoints((current) => [data.endpoint, ...current]);
            setSecret({ environment: form.environment, value: data.endpoint.secret });
            setForm({ url: '', environment: form.environment, events: WEBHOOK_EVENTS });
            toast.success('Webhook endpoint created');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to create webhook');
        } finally {
            setSaving(false);
        }
    };

    const update = async (endpoint, changes) => {
        try {
            const { data } = await apiClient.put(`/webhooks/endpoints/${endpoint._id}`, changes);
            setEndpoints((current) => current.map((item) => item._id === endpoint._id ? data.endpoint : item));
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to update webhook');
        }
    };

    const rotate = async (endpoint) => {
        if (!window.confirm('Regenerate this signing secret? The old secret will stop verifying signatures.')) return;
        try {
            const { data } = await apiClient.post(`/webhooks/endpoints/${endpoint._id}/regenerate-secret`);
            setSecret({ environment: endpoint.environment, value: data.endpoint.secret });
            toast.success('Signing secret regenerated');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to regenerate secret');
        }
    };

    const remove = async (endpoint) => {
        if (!window.confirm('Delete this webhook endpoint?')) return;
        try {
            await apiClient.delete(`/webhooks/endpoints/${endpoint._id}`);
            setEndpoints((current) => current.filter((item) => item._id !== endpoint._id));
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to delete webhook');
        }
    };

    const toggleEvent = (eventName) => setForm((current) => ({ ...current, events: current.events.includes(eventName) ? current.events.filter((item) => item !== eventName) : [...current.events, eventName] }));

    return <div className="space-y-6 pb-12">
        <div><div className="flex items-center gap-2 text-violet-600"><Webhook className="h-6 w-6" /><span className="text-xs font-bold uppercase tracking-wider">Event delivery</span></div><h1 className="mt-2 text-2xl font-black text-gray-900 sm:text-3xl">Webhooks</h1><p className="mt-1 text-sm text-gray-500">Receive signed payout status events at your server. Test and Live endpoints are isolated.</p></div>
        {secret && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><LockKeyhole className="h-4 w-4" /> Save your {secret.environment} signing secret</div><p className="my-2 text-xs text-emerald-700">This secret is shown only once. BluePay stores it encrypted and never includes it in endpoint listings.</p><div className="flex items-center gap-2 rounded-lg bg-white p-3"><code className="min-w-0 flex-1 break-all text-xs">{secret.value}</code><CopyButton value={secret.value} /></div></div>}
        <form onSubmit={create} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-gray-900">Add endpoint</h2><div className="mt-4 grid gap-3 lg:grid-cols-[1fr_150px]"><input required type="url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://merchant.example.com/bluepay/webhooks" className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" /><select value={form.environment} onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"><option value="test">Test</option><option value="live">Live</option></select></div><div className="mt-4 flex flex-wrap gap-2">{WEBHOOK_EVENTS.map((eventName) => <label key={eventName} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600"><input type="checkbox" checked={form.events.includes(eventName)} onChange={() => toggleEvent(eventName)} />{eventName}</label>)}</div><button disabled={saving} className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Creating...' : 'Create webhook endpoint'}</button></form>
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="border-b border-gray-100 px-5 py-4"><h2 className="font-bold text-gray-900">Configured endpoints</h2></div>{loading ? <p className="p-5 text-sm text-gray-500">Loading webhooks...</p> : endpoints.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No webhook endpoints configured.</p> : <div className="divide-y divide-gray-100">{endpoints.map((endpoint) => <div key={endpoint._id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${endpoint.environment === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><code className="truncate text-sm text-gray-800">{endpoint.url}</code><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold capitalize text-gray-600">{endpoint.environment}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${endpoint.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{endpoint.isActive ? 'active' : 'inactive'}</span></div><div className="mt-2 flex flex-wrap gap-1">{endpoint.events.map((eventName) => <span key={eventName} className="rounded bg-violet-50 px-2 py-1 text-xs text-violet-700">{eventName}</span>)}</div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => update(endpoint, { isActive: !endpoint.isActive })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">{endpoint.isActive ? 'Disable' : 'Enable'}</button><button type="button" onClick={() => rotate(endpoint)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">Regenerate secret</button><button type="button" onClick={() => remove(endpoint)} className="rounded-lg border border-red-200 p-2 text-red-600" title="Delete endpoint"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}</section>
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="border-b border-gray-100 px-5 py-4"><h2 className="font-bold text-gray-900">Recent deliveries</h2></div>{deliveries.length === 0 ? <p className="p-5 text-sm text-gray-500">No webhook deliveries yet.</p> : <div className="divide-y divide-gray-100">{deliveries.slice(0, 20).map((delivery) => <div key={delivery._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><div><span className="font-semibold text-gray-800">{delivery.event}</span><span className="ml-2 text-xs text-gray-400">{delivery.environment} · {delivery.eventId}</span></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${delivery.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : delivery.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{delivery.status} · {delivery.attempts} attempts</span></div>)}</div>}</section>
    </div>;
};

const CredentialsSection = () => {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rotating, setRotating] = useState(null);
    const [revealed, setRevealed] = useState({});
    const [newSecret, setNewSecret] = useState(null);

    const loadCredentials = async () => {
        try {
            const { data } = await apiClient.get('/developer/credentials');
            setCredentials(data.credentials || []);
        } catch (error) {
            // StrictMode double-invokes this effect in dev; apiClient's GET
            // dedup then aborts the first identical in-flight request, and
            // that abort must not be shown as a real load failure.
            if (error?.isCanceled) return;
            toast.error(error.response?.data?.msg || 'Unable to load credentials');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCredentials(); }, []);

    const rotate = async (environment) => {
        if (!window.confirm(`Regenerate the ${environment} credentials? Existing credentials will stop working.`)) return;
        setRotating(environment);
        try {
            const { data } = await apiClient.post(`/developer/credentials/${environment}/rotate`);
            setCredentials((current) => [...current.filter((item) => item.environment !== environment), data.credential].sort((a, b) => a.environment.localeCompare(b.environment)));
            setNewSecret({ environment, value: data.secret });
            toast.success(`${environment === 'live' ? 'Live' : 'Test'} credentials regenerated`);
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to regenerate credentials');
        } finally {
            setRotating(null);
        }
    };

        const request = `curl -X POST ${API_BASE}${PAYOUT_ENDPOINT} \\
    -H "x-api-key: bp_live_YOUR_API_KEY" \\
    -H "x-api-secret: bps_YOUR_API_SECRET" \\
    -H "x-bluepay-environment: live" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: payout-unique-request-id" \\
  -d '{
    "amount": 5000,
    "beneficiary_name": "Arjun Sharma",
    "account_number": "9876543210",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank"
  }'`;
    const response = `{
  "success": true,
  "msg": "Payout created",
  "payout": {
    "amount": 5000,
    "status": "processing",
    "beneficiary_name": "Arjun Sharma"
  },
  "wallet": { "availableBalance": 95000 }
}`;

    return (
        <div className="space-y-6 pb-12">
            <header className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300"><Terminal className="h-4 w-4" /> Merchant integration center</div>
                        <h1 className="text-3xl font-black tracking-tight">Developers</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Manage environment credentials and connect your server to the BluePay payout API.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> HTTPS API</div>
                </div>
            </header>

            <section className="space-y-4">
                <div><h2 className="text-xl font-bold text-gray-900">API credentials</h2><p className="mt-1 text-sm text-gray-500">Credentials belong only to your merchant account. Secrets are shown once after generation or rotation.</p></div>
                {newSecret && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800"><LockKeyhole className="h-4 w-4" /> Save this secret now</div><p className="mb-3 text-xs text-emerald-700">BluePay does not store a readable copy and will not show this value again.</p><div className="flex items-center gap-2 rounded-lg bg-white p-3"><code className="min-w-0 flex-1 break-all text-xs text-gray-800">{newSecret.value}</code><CopyButton value={newSecret.value} /></div></div>}
                {loading ? <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">Loading credentials...</div> : <div className="grid gap-4 lg:grid-cols-2">{['test', 'live'].map((environment) => {
                    const item = credentials.find((credential) => credential.environment === environment);
                    const isRevealed = revealed[environment];
                    return <article key={environment} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${environment === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><h3 className="font-bold capitalize text-gray-900">{environment} environment</h3></div><p className="mt-1 text-xs text-gray-500">{item ? `Rotated ${new Date(item.lastRotatedAt).toLocaleDateString()}` : 'Not generated yet'}</p></div><Key className="h-5 w-5 text-gray-400" /></div>
                        {item ? <div className="mt-5 space-y-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">API key</p><div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3"><code className="min-w-0 flex-1 break-all text-xs text-gray-700">{item.apiKey}</code><CopyButton value={item.apiKey} /></div></div><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">API secret</p><div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3"><code className="min-w-0 flex-1 break-all text-xs text-gray-500">{isRevealed ? `••••••••••••${item.secretLast4}` : '••••••••••••••••••••'}</code><button type="button" onClick={() => setRevealed((current) => ({ ...current, [environment]: !isRevealed }))} className="text-gray-500" title="Toggle secret visibility">{isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div></div> : <p className="mt-5 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">Generate credentials to start configuring this environment.</p>}
                        <button type="button" onClick={() => rotate(environment)} disabled={rotating === environment} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${rotating === environment ? 'animate-spin' : ''}`} />{item ? 'Regenerate credentials' : 'Generate credentials'}</button>
                    </article>;
                })}</div>}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-xl font-bold text-gray-900">Quick integration</h2><p className="mt-1 text-sm text-gray-500">These examples use the routes and response shape currently implemented by BluePay.</p></div><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">API base URL</p><div className="flex items-center justify-between rounded-lg bg-gray-50 p-3"><code className="text-sm text-gray-700">{API_BASE}/api/v1</code><CopyButton value={`${API_BASE}/api/v1`} /></div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Authentication</p><div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">Send your generated API key and secret in the <code className="font-semibold">x-api-key</code> and <code className="font-semibold">x-api-secret</code> headers, plus the matching environment.</div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Create payout</p><div className="flex items-center justify-between rounded-lg bg-gray-50 p-3"><code className="text-sm text-gray-700">POST {PAYOUT_ENDPOINT}</code><CopyButton value={PAYOUT_ENDPOINT} /></div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Required headers</p><ul className="space-y-1 text-sm text-gray-600"><li><code>x-api-key</code> generated environment API key</li><li><code>x-api-secret</code> generated API secret</li><li><code>x-bluepay-environment</code> <code>test</code> or <code>live</code></li><li><code>Content-Type</code> application/json</li><li><code>Idempotency-Key</code> unique key per payout request</li></ul></div></div><div className="space-y-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Example request</p><CodeBlock value={request} /></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Example response</p><CodeBlock value={response} /></div></div></div></section>
        </div>
    );
};

const Developers = ({ view }) => (view === 'API Documentation' ? <ApiDocumentation /> : view === 'Webhooks' ? <WebhooksSection /> : <CredentialsSection />);

export default Developers;
