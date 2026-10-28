import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, TrendingUp, XCircle } from 'lucide-react';
import apiClient from '../api/apiClient';

const SECTIONS = ['Payout Analytics', 'API Usage', 'Success vs Failure', 'Monthly Summary'];
const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const Empty = ({ text = 'No data available for the selected period.' }) => <div className="flex min-h-48 items-center justify-center text-sm text-gray-400">{text}</div>;
const Metric = ({ label, value, icon }) => { const IconComponent = icon; return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><IconComponent className="mb-3 h-5 w-5 text-blue-600" /><p className="text-2xl font-black text-gray-900">{value}</p><p className="mt-1 text-xs text-gray-400">{label}</p></div>; };
const Header = ({ title, icon }) => { const IconComponent = icon; return <div><h1 className="flex items-center gap-2 text-2xl font-black text-gray-900 sm:text-3xl"><IconComponent className="h-7 w-7 text-blue-600" />{title}</h1><p className="mt-1 text-sm text-gray-500">Live data from BluePay services.</p></div>; };
const Info = ({ text }) => <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">{text}</div>;
const Panel = ({ title, children }) => <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><h2 className="mb-3 font-black text-gray-900">{title}</h2>{children}</div>;
const useDashboard = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { apiClient.get('/users/dashboard').then((response) => setData(response.data)).catch((requestError) => setError(requestError.response?.data?.msg || 'Unable to load analytics')); }, []);
    return { data, error };
};

const PayoutAnalytics = () => {
    const { data, error } = useDashboard();
    const weekly = data?.weeklyData || [];
    const payouts = data?.recentPayouts || [];
    const success = payouts.filter((item) => item.status === 'success').length;
    const failed = payouts.filter((item) => item.status === 'failed').length;
    const maxAmount = Math.max(1, ...weekly.map((item) => Number(item.amount || 0)));
    return <div className="space-y-6"><Header title="Payout Analytics" icon={TrendingUp} /><Info text="Values are sourced from live payout records returned by the existing dashboard API." />{error ? <Empty text={error} /> : <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Metric label="Payouts loaded" value={payouts.length} icon={CheckCircle} /><Metric label="Successful" value={success} icon={CheckCircle} /><Metric label="Failed" value={failed} icon={XCircle} /><Metric label="Amount processed" value={formatCurrency(weekly.reduce((sum, item) => sum + Number(item.amount || 0), 0))} icon={TrendingUp} /></div><Panel title="Payout volume, last seven days">{weekly.length ? <div className="space-y-3">{weekly.map((item) => <div key={item.name} className="flex items-center gap-3 text-sm"><span className="w-12 text-gray-500">{item.name}</span><div className="h-7 flex-1 rounded bg-gray-100"><div className="h-full rounded bg-blue-500" style={{ width: `${Number(item.amount || 0) / maxAmount * 100}%` }} /></div><span className="w-28 text-right font-semibold">{formatCurrency(item.amount)}</span><span className="w-12 text-right text-gray-500">{item.count}</span></div>)}</div> : <Empty />}</Panel></>}</div>;
};

const APIUsage = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => { apiClient.get('/activity/api', { params: { limit: 100 } }).then((response) => setRows(response.data.data || [])).catch((requestError) => setError(requestError.response?.data?.msg || 'Unable to load API usage')).finally(() => setLoading(false)); }, []);
    const successful = rows.filter((row) => row.status === 'SUCCESS').length;
    const failed = rows.filter((row) => row.status === 'FAILED').length;
    const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.responseTime || 0), 0) / rows.length) : null;
    const endpoints = Object.entries(rows.reduce((result, row) => { const key = `${row.method || ''} ${row.endpoint || 'Unknown endpoint'}`.trim(); result[key] = (result[key] || 0) + 1; return result; }, {}));
    const statuses = Object.entries(rows.reduce((result, row) => { const key = row.statusCode || 'Unknown'; result[key] = (result[key] || 0) + 1; return result; }, {}));
    return <div className="space-y-6"><Header title="API Usage" icon={Activity} /><Info text="Only persisted API request activity is shown. No request totals or response-time metrics are invented." />{loading ? <Empty text="Loading API usage..." /> : error ? <Empty text={error} /> : <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Metric label="Recorded requests" value={rows.length} icon={Activity} /><Metric label="Successful" value={successful} icon={CheckCircle} /><Metric label="Failed" value={failed} icon={XCircle} /><Metric label="Average response" value={average == null ? 'Unavailable' : `${average} ms`} icon={Clock} /></div><div className="grid gap-6 lg:grid-cols-2"><Panel title="Requests by endpoint">{endpoints.length ? endpoints.map(([endpoint, count]) => <div key={endpoint} className="flex justify-between border-b border-gray-100 py-3 text-sm"><span className="font-mono text-gray-600">{endpoint}</span><strong>{count}</strong></div>) : <Empty />}</Panel><Panel title="Status codes">{statuses.length ? statuses.map(([status, count]) => <div key={status} className="flex justify-between border-b border-gray-100 py-3 text-sm"><span>{status}</span><strong>{count}</strong></div>) : <Empty />}</Panel></div></>}</div>;
};

const SuccessVsFailure = () => {
    const { data, error } = useDashboard();
    const weekly = data?.weeklyData || [];
    return <div className="space-y-6"><Header title="Success vs Failure" icon={BarChart3} /><Info text="Success and failure counts come from live payout records. Retry and failure-reason metrics are not persisted by the current backend." />{error ? <Empty text={error} /> : weekly.length ? <><div className="grid grid-cols-2 gap-4 lg:grid-cols-3"><Metric label="Payout observations" value={weekly.reduce((sum, item) => sum + Number(item.count || 0), 0)} icon={Activity} /><Metric label="Successful amount" value={formatCurrency(weekly.reduce((sum, item) => sum + Number(item.amount || 0), 0))} icon={CheckCircle} /><Metric label="Retry rate" value="Unavailable" icon={AlertTriangle} /></div><Panel title="Daily payout observations">{weekly.map((item) => <div key={item.name} className="flex justify-between border-b border-gray-100 py-3 text-sm"><span>{item.name}</span><span>{item.count} payouts · {formatCurrency(item.amount)} successful amount</span></div>)}</Panel></> : <Empty />}</div>;
};

const MonthlySummary = () => {
    const { data, error } = useDashboard();
    const summary = data?.walletSummary || {};
    return <div className="space-y-6"><Header title="Monthly Summary" icon={TrendingUp} /><Info text="Monthly totals use the current month values exposed by the existing dashboard API." />{error ? <Empty text={error} /> : <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Metric label="Monthly credits" value={formatCurrency(summary.monthCredits)} icon={TrendingUp} /><Metric label="Monthly debits" value={formatCurrency(summary.monthDebits)} icon={TrendingUp} /><Metric label="Successful payouts" value={summary.monthSuccess || 0} icon={CheckCircle} /><Metric label="Failed payouts" value={summary.monthFailed || 0} icon={XCircle} /></div><Panel title="Current month summary"><div className="grid gap-3 sm:grid-cols-2"><p className="text-sm text-gray-600">Total payout observations: <strong>{summary.monthTotal || 0}</strong></p><p className="text-sm text-gray-600">Pending funding amount: <strong>{formatCurrency(summary.pendingRequestsAmount)}</strong></p></div></Panel></>}</div>;
};

const Analytics = ({ view }) => { const [selectedSection, setSelectedSection] = useState(SECTIONS[0]); const section = SECTIONS.includes(view) ? view : selectedSection; return <div className="w-full space-y-6 pb-12"><div className="flex flex-wrap gap-2 rounded-xl bg-gray-100 p-1">{SECTIONS.map((item) => <button type="button" key={item} onClick={() => setSelectedSection(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${section === item ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}>{item}</button>)}</div>{section === 'Payout Analytics' && <PayoutAnalytics />}{section === 'API Usage' && <APIUsage />}{section === 'Success vs Failure' && <SuccessVsFailure />}{section === 'Monthly Summary' && <MonthlySummary />}</div>; };

export default Analytics;
