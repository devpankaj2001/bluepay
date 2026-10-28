import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity, ChevronDown, ChevronUp, Clock3, Copy,
    RefreshCw, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';

const API_DEFINITIONS = [
    {
        id: 'oauth',
        name: 'OAuth Token API',
        apiName: 'OAuth Token API',
        method: 'POST',
        url: 'https://apigwuat.kotak.com:8443/auth/oauth/v2/token',
        kind: 'oauth',
    },
    {
        id: 'payment',
        name: 'Payment API',
        apiName: 'Payment API',
        method: 'POST',
        url: 'https://apigwuat.kotak.com:8443/v1/cms/pay',
        kind: 'payment',
    },
    {
        id: 'status',
        name: 'Status / Reversal API',
        apiName: 'Status / Reversal API',
        method: 'POST',
        url: 'https://apigwuat.kotak.com:8443/v1/cms/rev',
        kind: 'status',
    },
];
const AUDIT_POLL_INTERVAL_MS = 30000;

const STATUS_STYLES = {
    SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PROCESSING: 'bg-amber-50 text-amber-800 border-amber-200',
    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
    UNKNOWN: 'bg-gray-100 text-gray-600 border-gray-200',
};

const formatStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'success') return 'SUCCESS';
    if (normalized === 'processing') return 'PROCESSING';
    if (normalized === 'pending') return 'PENDING';
    if (normalized === 'failed') return 'FAILED';
    return 'UNKNOWN';
};

const StatusBadge = ({ status }) => {
    const label = formatStatus(status);
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[label]}`}>
            {label}
        </span>
    );
};

const displayValue = (value) => (value === null || value === undefined || value === '' ? '—' : String(value));

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN');
};

const sanitizeText = (value) => String(value || '')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(
        /(client\s*secret|api\s*secret|api\s*key|access\s*token|password|encryption\s*key|private\s*key|authorization)(?:\s+is)?(\s*[:=]\s*|\s+)[^\s,;]+/gi,
        '$1: [REDACTED]'
    );

const isKotakPayout = (payout) => (
    String(payout.provider || '').toUpperCase() === 'KOTAK' ||
    Boolean(payout.providerReference || payout.providerTransactionId || payout.providerStatus || payout.providerResponseCode)
);

const formatRuntimeValue = (value, fallback = 'Not recorded on this request') => {
    if (value === null || value === undefined || value === '') return fallback;
    return typeof value === 'string' ? sanitizeText(value) : JSON.stringify(value, null, 2);
};

const copyValue = async (value, label) => {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
    } catch {
        toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
};

const CopyButton = ({ value, label }) => (
    <button
        type="button"
        onClick={() => copyValue(value, label)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
    >
        <Copy className="h-3.5 w-3.5" />
        {label}
    </button>
);

const Disclosure = ({ title, children, initiallyOpen = true, count }) => {
    const [open, setOpen] = useState(initiallyOpen);
    return (
        <section className="border-t border-gray-100">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full items-center justify-between py-3 text-left"
            >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    {title}
                    {count !== undefined && <span className="text-xs font-normal text-gray-400">{count}</span>}
                </span>
                {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {open && <div className="pb-4">{children}</div>}
        </section>
    );
};

const CodeBlock = ({ children, tone = 'neutral' }) => {
    const tones = {
        neutral: 'border-gray-800 bg-gray-950 text-gray-200',
        success: 'border-emerald-900 bg-emerald-950 text-emerald-100',
        warning: 'border-amber-800 bg-amber-950 text-amber-100',
        error: 'border-red-900 bg-red-950 text-red-100',
        unknown: 'border-gray-700 bg-gray-900 text-gray-300',
    };
    return <pre className={`max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg border p-3 font-mono text-xs leading-5 ${tones[tone]}`}>{children}</pre>;
};

const InfoValue = ({ label, value }) => (
    <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className="mt-1 break-all text-sm font-medium text-gray-800">{value || 'Not available'}</div>
    </div>
);

const getLinkedTransaction = (payout, transactions) => transactions.find((transaction) => (
    String(transaction.referenceType || '').toLowerCase() === 'kotak' &&
    [payout._id, payout.providerReference, payout.providerTransactionId, payout.txn_id]
        .some((reference) => reference && String(transaction.referenceId) === String(reference))
));

const AuditTable = ({ rows, loading, error }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <tr>
                    {['Date & Time', 'Endpoint', 'Method', 'Environment', 'HTTP Status', 'Response Time', 'Request ID', 'Message ID', 'Transaction ID', 'Status'].map((label) => (
                        <th key={label} className="whitespace-nowrap px-3 py-2 font-semibold">{label}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                    <tr><td colSpan={10} className="px-3 py-5 text-center text-gray-400">Loading Kotak runtime audit logs...</td></tr>
                ) : error ? (
                    <tr><td colSpan={10} className="px-3 py-5 text-center text-red-600">{error}</td></tr>
                ) : rows.length === 0 ? (
                    <tr><td colSpan={10} className="px-3 py-5 text-center text-gray-500">No runtime request recorded.</td></tr>
                ) : rows.map((row) => (
                    <tr key={row._id} className="text-gray-700">
                        <td className="whitespace-nowrap px-3 py-2.5">{formatDate(row.requestTimestamp || row.createdAt)}</td>
                        <td className="max-w-52 truncate px-3 py-2.5 font-mono" title={row.endpoint}>{displayValue(row.endpoint)}</td>
                        <td className="px-3 py-2.5 font-mono">{displayValue(row.method)}</td>
                        <td className="px-3 py-2.5">{displayValue(row.environment)}</td>
                        <td className="px-3 py-2.5 font-mono">{displayValue(row.httpStatus)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{row.durationMs == null ? '—' : `${row.durationMs} ms`}</td>
                        <td className="max-w-36 truncate px-3 py-2.5 font-mono" title={row.requestId || ''}>{sanitizeText(displayValue(row.requestId))}</td>
                        <td className="max-w-32 truncate px-3 py-2.5 font-mono" title={row.messageId || ''}>{displayValue(row.messageId)}</td>
                        <td className="max-w-32 truncate px-3 py-2.5 font-mono" title={row.transactionId || ''}>{displayValue(row.transactionId)}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={row.applicationStatus} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const PayoutTable = ({ payouts, transactions, loading, error, title }) => (
    <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">{title}</h4>
        {error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-4 text-sm text-red-600">{error}</div>
        ) : loading ? (
            <div className="rounded-lg border border-gray-200 px-3 py-4 text-center text-sm text-gray-400">Loading payout records...</div>
        ) : payouts.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">No matching Kotak payout records are available.</div>
        ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[1080px] text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                        <tr>
                            {['Transaction ID', 'Payout ID', 'Provider Reference', 'Kotak Reference', 'Status', 'Response Code', 'Response Message', 'Request ID', 'Created At', 'Updated At'].map((label) => (
                                <th key={label} className="whitespace-nowrap px-3 py-2 font-semibold">{label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {payouts.slice(0, 8).map((payout) => {
                            const transaction = getLinkedTransaction(payout, transactions);
                            return (
                                <tr key={payout._id} className="align-top text-gray-700">
                                    <td className="px-3 py-2.5 font-mono">{displayValue(transaction?.transactionId || payout.txn_id)}</td>
                                    <td className="max-w-32 truncate px-3 py-2.5 font-mono" title={payout._id}>{displayValue(payout._id)}</td>
                                    <td className="max-w-36 truncate px-3 py-2.5 font-mono" title={payout.providerReference || ''}>{displayValue(payout.providerReference)}</td>
                                    <td className="max-w-36 truncate px-3 py-2.5 font-mono" title={payout.providerTransactionId || ''}>{displayValue(payout.providerTransactionId)}</td>
                                    <td className="px-3 py-2.5"><StatusBadge status={payout.status} /><div className="mt-1 text-gray-400">{displayValue(payout.providerStatus)}</div></td>
                                    <td className="px-3 py-2.5 font-mono">{displayValue(payout.providerResponseCode)}</td>
                                    <td className="max-w-48 px-3 py-2.5" title={sanitizeText(payout.providerMessage)}>{payout.providerMessage ? sanitizeText(payout.providerMessage) : '—'}</td>
                                    <td className="max-w-32 truncate px-3 py-2.5 font-mono" title={payout.providerRequestId || ''}>{sanitizeText(displayValue(payout.providerRequestId))}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5">{formatDate(payout.createdAt)}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5">{formatDate(payout.updatedAt)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {payouts.length > 8 && <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">Showing 8 of {payouts.length} matching records.</div>}
            </div>
        )}
    </div>
);

const RuntimeResponse = ({ record }) => {
    const tone = record?.applicationStatus === 'FAILED'
        ? 'error'
        : record?.applicationStatus === 'PROCESSING'
            ? 'warning'
            : record?.applicationStatus === 'SUCCESS'
                ? 'success'
                : 'unknown';
    const panelTone = tone === 'error' ? 'border-red-100 bg-red-50/60' : tone === 'warning' ? 'border-amber-100 bg-amber-50/60' : tone === 'success' ? 'border-emerald-100 bg-emerald-50/60' : 'border-gray-200 bg-gray-50';
    return (
    <div className={`rounded-lg border p-3 ${panelTone}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-800">{record ? 'Live Runtime Response' : 'No runtime request recorded.'}</span>
            {record && <CopyButton value={formatRuntimeValue(record.responseBodySanitized)} label="Copy Response" />}
        </div>
        <CodeBlock tone={tone}>
            {record ? formatRuntimeValue(record.responseBodySanitized) : 'No runtime request recorded.'}
        </CodeBlock>
        {record && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <InfoValue label="Response Code" value={record.responseCode || '—'} />
                <InfoValue label="Response Message" value={record.responseMessage || record.errorMessage || '—'} />
                <InfoValue label="Error Code" value={record.errorCode || '—'} />
                <InfoValue label="Error Message" value={record.errorMessage || '—'} />
            </div>
        )}
    </div>
    );
};

const ApiCard = ({ definition, auditLogs, payouts, transactions, loading, errors }) => {
    const auditRows = auditLogs.filter((row) => row.apiName === definition.apiName);
    const runtimeLog = auditRows[0];
    const kotakPayouts = payouts.filter(isKotakPayout);
    const statusPayouts = kotakPayouts.filter((payout) => payout.lastStatusCheckedAt);
    const relevantPayouts = (definition.kind === 'status' ? statusPayouts : kotakPayouts)
        .sort((left, right) => {
            const leftDate = definition.kind === 'status' ? left.lastStatusCheckedAt : left.submittedAt || left.createdAt;
            const rightDate = definition.kind === 'status' ? right.lastStatusCheckedAt : right.submittedAt || right.createdAt;
            return new Date(rightDate || 0) - new Date(leftDate || 0);
        });
    const latestPayout = relevantPayouts[0];
    const activeEndpoint = runtimeLog?.endpoint || definition.url;
    const statusValue = runtimeLog?.applicationStatus || 'unknown';
    const runtimeDate = runtimeLog?.requestTimestamp || runtimeLog?.createdAt;
    const headersText = runtimeLog
        ? formatRuntimeValue(runtimeLog.requestHeadersSanitized)
        : 'No runtime request recorded.';
    const payloadText = runtimeLog
        ? formatRuntimeValue(runtimeLog.requestPayloadSanitized)
        : 'No runtime request recorded.';

    return (
        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4 md:px-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-blue-100 px-2 py-1 font-mono text-[11px] font-bold text-blue-800">{definition.method}</span>
                            <h2 className="text-lg font-semibold text-gray-900">{definition.name}</h2>
                            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">{runtimeLog?.environment || 'UAT reference'}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Kotak CMS · Existing integration reference</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <CopyButton value={activeEndpoint} label="Copy URL" />
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <code className="break-all font-mono text-xs text-gray-700">{activeEndpoint}</code>
                    <span className="shrink-0 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">POST · HTTPS</span>
                </div>
                {runtimeLog && activeEndpoint !== definition.url && (
                    <p className="mt-2 text-[11px] text-gray-500">Configured UAT reference: <code className="break-all">{definition.url}</code></p>
                )}
            </div>

            <div className="space-y-5 px-5 py-4 md:px-6">
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
                    <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Application Status</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusBadge status={statusValue} />
                            <span className="text-[11px] text-gray-500">{runtimeLog ? 'Live Runtime Response' : 'No runtime request recorded.'}</span>
                        </div>
                    </div>
                    <InfoValue label="HTTP Status" value={runtimeLog?.httpStatus ?? '—'} />
                    <InfoValue label="Request Time" value={formatDate(runtimeDate)} />
                    <InfoValue label="Response Time" value={runtimeLog?.durationMs == null ? '—' : `${runtimeLog.durationMs} ms`} />
                    <InfoValue label="Response Timestamp" value={formatDate(runtimeLog?.responseTimestamp)} />
                    <InfoValue label="Request ID" value={sanitizeText(runtimeLog?.requestId || latestPayout?.providerRequestId || '') || '—'} />
                    <InfoValue label="Environment" value={runtimeLog?.environment || latestPayout?.environment || '—'} />
                    <InfoValue label="Message ID" value={runtimeLog?.messageId || '—'} />
                    <InfoValue label="Transaction ID" value={runtimeLog?.transactionId || '—'} />
                    <InfoValue label="Provider Reference" value={runtimeLog?.providerReference || latestPayout?.providerReference || '—'} />
                </div>

                {runtimeLog?.httpStatus === 403 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>HTTP 403 · {/(wrong\s*ip|ip\s*whitelist)/i.test(runtimeLog.responseMessage || '') ? 'Wrong IP / Gateway Alert' : 'Kotak gateway rejection'}: {runtimeLog.responseMessage || runtimeLog.errorMessage || 'No response message recorded.'}</span>
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold uppercase text-gray-500">Request Headers</h3>
                        </div>
                        <CodeBlock>{headersText}</CodeBlock>
                    </div>
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold uppercase text-gray-500">Sanitized Request Payload</h3>
                            {runtimeLog && <CopyButton value={payloadText} label="Copy Request" />}
                        </div>
                        <CodeBlock>{payloadText}</CodeBlock>
                    </div>
                </div>

                <Disclosure title="Response" initiallyOpen>
                    {runtimeLog?.tokenType && (
                        <div className="mb-3 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-3">
                            <InfoValue label="Token Type" value={runtimeLog.tokenType} />
                            <InfoValue label="Expires In" value={runtimeLog.expiresIn == null ? '—' : `${runtimeLog.expiresIn} seconds`} />
                            <InfoValue label="Response Timestamp" value={formatDate(runtimeLog.responseTimestamp)} />
                        </div>
                    )}
                    <RuntimeResponse record={runtimeLog} />
                </Disclosure>

                <Disclosure title="Application Logs" count={`${auditRows.length} runtime records`} initiallyOpen>
                    <div className="mb-2 flex items-start gap-2 text-xs text-gray-500">
                        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Actual outbound Kotak calls captured by the existing integration. Authorization and sensitive payload values are redacted before storage.
                    </div>
                    <AuditTable rows={auditRows} loading={loading} error={errors.logs} />
                </Disclosure>

                {definition.kind !== 'oauth' && (
                    <Disclosure
                        title={definition.kind === 'status' ? 'Payout Status / Kotak References' : 'Kotak Payout & Transaction References'}
                        count={`${relevantPayouts.length} records`}
                        initiallyOpen
                    >
                        <PayoutTable
                            payouts={relevantPayouts}
                            transactions={transactions}
                            loading={loading}
                            error={errors.payouts || errors.transactions}
                            title={definition.kind === 'status' ? 'Records with a status-check timestamp' : 'Persisted Kotak provider records'}
                        />
                    </Disclosure>
                )}

                {definition.kind === 'oauth' && !runtimeLog && (
                    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        No runtime request recorded.
                    </div>
                )}
            </div>
        </article>
    );
};

const ApiPartnerReference = () => {
    const [data, setData] = useState({ auditLogs: [], payouts: [], transactions: [] });
    const [errors, setErrors] = useState({ logs: null, payouts: null, transactions: null });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const results = await Promise.allSettled([
            apiClient.get('/admin/kotak-api-logs', { params: { page: 1, limit: 100 } }),
            apiClient.get('/payouts'),
            apiClient.get('/admin/reports/transactions', { params: { page: 1, limit: 100 } }),
        ]);

        const [logsResult, payoutsResult, transactionsResult] = results;
        setData({
            auditLogs: logsResult.status === 'fulfilled' ? logsResult.value.data?.logs || [] : [],
            payouts: payoutsResult.status === 'fulfilled' && Array.isArray(payoutsResult.value.data) ? payoutsResult.value.data : [],
            transactions: transactionsResult.status === 'fulfilled' ? transactionsResult.value.data?.rows || [] : [],
        });
        setErrors({
            logs: logsResult.status === 'rejected' && !logsResult.reason?.isCanceled ? 'Unable to load Kotak runtime audit logs.' : null,
            payouts: payoutsResult.status === 'rejected' && !payoutsResult.reason?.isCanceled ? 'Unable to load payout records.' : null,
            transactions: transactionsResult.status === 'rejected' && !transactionsResult.reason?.isCanceled ? 'Unable to load transaction references.' : null,
        });
        setLoading(false);
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => { load(); }, 0);
        const intervalId = window.setInterval(load, AUDIT_POLL_INTERVAL_MS);
        return () => {
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
        };
    }, [load]);

    const kotakPayouts = useMemo(() => data.payouts.filter(isKotakPayout), [data.payouts]);
    const kotakTransactions = useMemo(
        () => data.transactions.filter((transaction) => String(transaction.referenceType || '').toLowerCase() === 'kotak'),
        [data.transactions]
    );
    return (
        <Layout>
            <div className="mb-5 mt-7 flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                        <Link to="/dashboard" className="hover:text-indigo-600">Home</Link>
                        <span>/</span>
                        <span className="text-gray-600">API Partner Reference</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900">Kotak CMS – API Partner Reference</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">View Kotak CMS API endpoints, status, responses, payload information and application logs.</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setLoading(true); load(); }}
                    disabled={loading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh data
                </button>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-gray-100 pb-4 text-xs text-gray-500">
                <span><strong className="font-semibold text-gray-800">3</strong> API references</span>
                <span><strong className="font-semibold text-gray-800">{data.auditLogs.length}</strong> runtime audit records loaded</span>
                <span><strong className="font-semibold text-gray-800">{kotakPayouts.length}</strong> Kotak provider records</span>
                <span><strong className="font-semibold text-gray-800">{kotakTransactions.length}</strong> Kotak ledger references</span>
            </div>

            <div className="space-y-5 pb-8">
                {API_DEFINITIONS.map((definition) => (
                    <ApiCard
                        key={definition.id}
                        definition={definition}
                        auditLogs={data.auditLogs}
                        payouts={data.payouts}
                        transactions={data.transactions}
                        loading={loading}
                        errors={errors}
                    />
                ))}
            </div>
        </Layout>
    );
};

export default ApiPartnerReference;