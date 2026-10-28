/* eslint-disable react-hooks/set-state-in-effect -- mirrors AuthContext.jsx's pattern: the initial data load is a deliberate, one-shot effect-driven fetch, not a render-loop hazard */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import {
    RefreshCw, Users, UserCheck, ShieldAlert, Wallet, ArrowDownLeft,
    CreditCard, CheckCircle2, XCircle, Clock, AlertTriangle, Inbox,
} from 'lucide-react';

const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const number = (value) => Number(value || 0).toLocaleString('en-IN');

const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return '—';
    const str = String(accountNumber);
    if (str.length <= 4) return str;
    return `${'X'.repeat(str.length - 4)}${str.slice(-4)}`;
};

const PAYOUT_STATUS_STYLES = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

const FUND_STATUS_STYLES = {
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
};

const StatusBadge = ({ status, styles }) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {status || 'unknown'}
    </span>
);

// Builds the last `days` calendar-day buckets (oldest -> newest) so trend
// bars always render a full, evenly-spaced axis even when some days have
// zero records, instead of only showing days that happen to have data.
const buildDailyBuckets = (records, days, dateField, amountField) => {
    const buckets = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const key = day.toISOString().slice(0, 10);
        buckets.push({ key, label: day.toLocaleDateString('en-IN', { weekday: 'short' }), count: 0, amount: 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    records.forEach((record) => {
        const raw = record[dateField];
        if (!raw) return;
        const key = new Date(raw).toISOString().slice(0, 10);
        const bucket = byKey.get(key);
        if (!bucket) return;
        bucket.count += 1;
        if (amountField) bucket.amount += Number(record[amountField] || 0);
    });
    return buckets;
};

const SectionState = ({ loading, error, empty, loadingLabel, emptyLabel, onRetry }) => {
    if (loading) {
        return <div className="flex items-center justify-center h-32 text-sm text-gray-400 gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> {loadingLabel}</div>;
    }
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-red-500 gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>{error}</span>
                {onRetry && <button onClick={onRetry} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>}
            </div>
        );
    }
    if (empty) {
        return (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400 gap-2">
                <Inbox className="w-5 h-5" />
                <span>{emptyLabel}</span>
            </div>
        );
    }
    return null;
};

const BarTrend = ({ buckets, valueKey, formatValue }) => {
    const max = Math.max(1, ...buckets.map((b) => b[valueKey]));
    return (
        <div className="flex items-end justify-between gap-2 h-40">
            {buckets.map((bucket) => (
                <div key={bucket.key} className="flex flex-col items-center flex-1 h-full justify-end group">
                    <span className="text-[10px] text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatValue(bucket[valueKey])}
                    </span>
                    <div
                        className="w-full rounded-t-sm bg-gradient-to-t from-blue-300 to-blue-600 transition-all"
                        style={{ height: `${Math.max(4, (bucket[valueKey] / max) * 100)}%` }}
                    />
                    <span className="text-[10px] text-gray-400 mt-2">{bucket.label}</span>
                </div>
            ))}
        </div>
    );
};

const initialSection = { data: null, loading: true, error: null };

const Dashboard = () => {
    const [stats, setStats] = useState(initialSection);
    const [payouts, setPayouts] = useState(initialSection);
    const [fundRequests, setFundRequests] = useState(initialSection);
    const [transactions, setTransactions] = useState(initialSection);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadStats = useCallback(async () => {
        setStats((s) => ({ ...s, loading: true, error: null }));
        try {
            const response = await apiClient.get('/admin/dashboard');
            setStats({ data: response.data.stats, loading: false, error: null });
        } catch (error) {
            if (error?.isCanceled) return;
            setStats({ data: null, loading: false, error: error.response?.data?.msg || 'Failed to load dashboard statistics' });
        }
    }, []);

    const loadPayouts = useCallback(async () => {
        setPayouts((s) => ({ ...s, loading: true, error: null }));
        try {
            const response = await apiClient.get('/payouts');
            setPayouts({ data: Array.isArray(response.data) ? response.data : [], loading: false, error: null });
        } catch (error) {
            if (error?.isCanceled) return;
            setPayouts({ data: null, loading: false, error: error.response?.data?.msg || 'Failed to load payouts' });
        }
    }, []);

    const loadFundRequests = useCallback(async () => {
        setFundRequests((s) => ({ ...s, loading: true, error: null }));
        try {
            const response = await apiClient.get('/funds', { params: { limit: 100 } });
            setFundRequests({ data: Array.isArray(response.data?.requests) ? response.data.requests : [], loading: false, error: null });
        } catch (error) {
            if (error?.isCanceled) return;
            setFundRequests({ data: null, loading: false, error: error.response?.data?.msg || 'Failed to load fund requests' });
        }
    }, []);

    const loadTransactions = useCallback(async () => {
        setTransactions((s) => ({ ...s, loading: true, error: null }));
        try {
            const response = await apiClient.get('/admin/reports/transactions', { params: { limit: 8 } });
            setTransactions({ data: response.data?.rows || [], loading: false, error: null });
        } catch (error) {
            if (error?.isCanceled) return;
            setTransactions({ data: null, loading: false, error: error.response?.data?.msg || 'Failed to load transaction activity' });
        }
    }, []);

    const loadAll = useCallback(() => {
        loadStats();
        loadPayouts();
        loadFundRequests();
        loadTransactions();
        setLastUpdated(new Date());
    }, [loadStats, loadPayouts, loadFundRequests, loadTransactions]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const s = stats.data || {};

    const summaryCards = [
        { label: 'Total Merchants', value: number(s.users), icon: Users, tone: 'text-indigo-600 bg-indigo-50' },
        { label: 'Active Merchants', value: number(s.activeUsers), icon: UserCheck, tone: 'text-emerald-600 bg-emerald-50' },
        { label: 'Pending KYC', value: number(s.pendingKyc), icon: ShieldAlert, tone: 'text-amber-600 bg-amber-50' },
        { label: 'Total Wallet Balance', value: currency((s.availableBalance || 0) + (s.lockedBalance || 0)), icon: Wallet, tone: 'text-blue-600 bg-blue-50' },
        { label: 'Total Funded Amount', value: currency(s.totalFundedAmount), icon: ArrowDownLeft, tone: 'text-cyan-600 bg-cyan-50' },
        { label: 'Total Payout Amount', value: currency(s.successfulPayoutAmount), icon: CreditCard, tone: 'text-purple-600 bg-purple-50' },
        { label: 'Successful Payouts', value: number(s.successfulPayouts), icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
        { label: 'Failed Payouts', value: number(s.failedPayouts), icon: XCircle, tone: 'text-red-600 bg-red-50' },
        { label: 'Pending Fund Requests', value: number(s.pendingFundRequests), icon: Clock, tone: 'text-amber-600 bg-amber-50' },
    ];

    const payoutBuckets = useMemo(() => buildDailyBuckets(payouts.data || [], 7, 'createdAt', 'amount'), [payouts.data]);
    const fundBuckets = useMemo(
        () => buildDailyBuckets((fundRequests.data || []).filter((f) => f.status === 'approved'), 7, 'createdAt', 'amount'),
        [fundRequests.data]
    );

    const statusDistribution = useMemo(() => {
        const counts = { success: 0, pending: 0, processing: 0, failed: 0, unknown: 0 };
        (payouts.data || []).forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
        return counts;
    }, [payouts.data]);
    const totalForDistribution = Object.values(statusDistribution).reduce((a, b) => a + b, 0);

    const recentPayouts = (payouts.data || []).slice(0, 8);
    const recentFundRequests = (fundRequests.data || []).slice(0, 8);
    const recentTransactions = transactions.data || [];

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-8 gap-4">
                <h1 className="text-[3rem] font-medium text-gray-900 tracking-tight leading-none">Overview</h1>
                <div className="flex items-center gap-3 text-gray-500 font-medium text-sm">
                    <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN')}` : ''}</span>
                    <button
                        onClick={loadAll}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${stats.loading || payouts.loading || fundRequests.loading || transactions.loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {stats.loading || stats.error ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-6">
                    <SectionState loading={stats.loading} error={stats.error} loadingLabel="Loading dashboard statistics..." onRetry={loadStats} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                    {summaryCards.map((card) => (
                        <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.tone}`}>
                                <card.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide truncate">{card.label}</div>
                                <div className="text-xl font-semibold text-gray-900 mt-0.5 truncate">{card.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                <div className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-medium text-gray-900 mb-1">Payout Activity</h2>
                    <p className="text-xs text-gray-400 mb-4">Last 7 days, based on the most recent payouts on record</p>
                    {payouts.loading || payouts.error || !payoutBuckets.some((b) => b.count > 0) ? (
                        <SectionState
                            loading={payouts.loading}
                            error={payouts.error}
                            empty={!payouts.loading && !payouts.error}
                            loadingLabel="Loading payout activity..."
                            emptyLabel="No payout activity in the last 7 days"
                            onRetry={loadPayouts}
                        />
                    ) : (
                        <BarTrend buckets={payoutBuckets} valueKey="amount" formatValue={currency} />
                    )}
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-medium text-gray-900 mb-1">Success / Failure Split</h2>
                    <p className="text-xs text-gray-400 mb-4">Based on {number(totalForDistribution)} recent payouts</p>
                    {payouts.loading || payouts.error || totalForDistribution === 0 ? (
                        <SectionState
                            loading={payouts.loading}
                            error={payouts.error}
                            empty={!payouts.loading && !payouts.error}
                            loadingLabel="Loading..."
                            emptyLabel="No payouts to analyze"
                            onRetry={loadPayouts}
                        />
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(statusDistribution).filter(([, count]) => count > 0).map(([status, count]) => (
                                <div key={status}>
                                    <div className="flex justify-between items-center mb-1 text-xs">
                                        <span className="capitalize text-gray-600 font-medium">{status}</span>
                                        <span className="text-gray-400">{count} ({Math.round((count / totalForDistribution) * 100)}%)</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${status === 'success' ? 'bg-emerald-500' : status === 'failed' ? 'bg-red-500' : status === 'processing' ? 'bg-blue-500' : status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'}`}
                                            style={{ width: `${(count / totalForDistribution) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-1">Funding Activity</h2>
                <p className="text-xs text-gray-400 mb-4">Approved fund requests, last 7 days</p>
                {fundRequests.loading || fundRequests.error || !fundBuckets.some((b) => b.count > 0) ? (
                    <SectionState
                        loading={fundRequests.loading}
                        error={fundRequests.error}
                        empty={!fundRequests.loading && !fundRequests.error}
                        loadingLabel="Loading funding activity..."
                        emptyLabel="No approved fund requests in the last 7 days"
                        onRetry={loadFundRequests}
                    />
                ) : (
                    <BarTrend buckets={fundBuckets} valueKey="amount" formatValue={currency} />
                )}
            </div>

            {/* Recent Payouts + Fund Requests */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 font-medium text-gray-900">Recent Payouts</div>
                    {payouts.loading || payouts.error || recentPayouts.length === 0 ? (
                        <SectionState
                            loading={payouts.loading}
                            error={payouts.error}
                            empty={!payouts.loading && !payouts.error}
                            loadingLabel="Loading recent payouts..."
                            emptyLabel="No payouts yet"
                            onRetry={loadPayouts}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-2.5">Merchant</th>
                                        <th className="text-left px-5 py-2.5">Account</th>
                                        <th className="text-right px-5 py-2.5">Amount</th>
                                        <th className="text-left px-5 py-2.5">Status</th>
                                        <th className="text-left px-5 py-2.5">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentPayouts.map((p) => (
                                        <tr key={p._id}>
                                            <td className="px-5 py-2.5 text-gray-700">
                                                <div className="font-medium">{p.userId?.first_name} {p.userId?.last_name}</div>
                                                <div className="text-xs text-gray-400">{p.userId?.email}</div>
                                            </td>
                                            <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">{maskAccountNumber(p.account_number)}</td>
                                            <td className="px-5 py-2.5 text-right font-medium text-gray-900">{currency(p.amount)}</td>
                                            <td className="px-5 py-2.5"><StatusBadge status={p.status} styles={PAYOUT_STATUS_STYLES} /></td>
                                            <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 font-medium text-gray-900">Recent Fund Requests</div>
                    {fundRequests.loading || fundRequests.error || recentFundRequests.length === 0 ? (
                        <SectionState
                            loading={fundRequests.loading}
                            error={fundRequests.error}
                            empty={!fundRequests.loading && !fundRequests.error}
                            loadingLabel="Loading recent fund requests..."
                            emptyLabel="No fund requests yet"
                            onRetry={loadFundRequests}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-2.5">Merchant</th>
                                        <th className="text-left px-5 py-2.5">UTR</th>
                                        <th className="text-right px-5 py-2.5">Amount</th>
                                        <th className="text-left px-5 py-2.5">Status</th>
                                        <th className="text-left px-5 py-2.5">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentFundRequests.map((f) => (
                                        <tr key={f._id}>
                                            <td className="px-5 py-2.5 text-gray-700">
                                                <div className="font-medium">{f.userId?.first_name} {f.userId?.last_name}</div>
                                                <div className="text-xs text-gray-400">{f.userId?.email}</div>
                                            </td>
                                            <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">{f.utr_number || '—'}</td>
                                            <td className="px-5 py-2.5 text-right font-medium text-gray-900">{currency(f.amount)}</td>
                                            <td className="px-5 py-2.5"><StatusBadge status={f.status} styles={FUND_STATUS_STYLES} /></td>
                                            <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{new Date(f.createdAt).toLocaleDateString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction Activity */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-100 font-medium text-gray-900">Transaction Activity</div>
                {transactions.loading || transactions.error || recentTransactions.length === 0 ? (
                    <SectionState
                        loading={transactions.loading}
                        error={transactions.error}
                        empty={!transactions.loading && !transactions.error}
                        loadingLabel="Loading transaction activity..."
                        emptyLabel="No ledger transactions yet"
                        onRetry={loadTransactions}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="text-left px-5 py-2.5">Merchant</th>
                                    <th className="text-left px-5 py-2.5">Type</th>
                                    <th className="text-left px-5 py-2.5">Category</th>
                                    <th className="text-right px-5 py-2.5">Amount</th>
                                    <th className="text-left px-5 py-2.5">Status</th>
                                    <th className="text-left px-5 py-2.5">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentTransactions.map((t) => (
                                    <tr key={t._id}>
                                        <td className="px-5 py-2.5 text-gray-700">
                                            <div className="font-medium">{t.merchant?.name}</div>
                                            <div className="text-xs text-gray-400">{t.merchant?.email}</div>
                                        </td>
                                        <td className="px-5 py-2.5 text-gray-600">{t.type}</td>
                                        <td className="px-5 py-2.5 text-gray-600">{t.category}</td>
                                        <td className="px-5 py-2.5 text-right font-medium text-gray-900">{currency(t.amount)}</td>
                                        <td className="px-5 py-2.5 text-gray-600">{t.status}</td>
                                        <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;
