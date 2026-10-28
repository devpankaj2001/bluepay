import React, { useEffect, useState } from 'react';
import { FileDown, FileText, Filter, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';

const TABS = ['Transaction Reports', 'Wallet Reports', 'API Usage Reports', 'Export CSV / PDF'];
const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const useReport = (type, filters) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        apiClient.get(`/admin/reports/${type}`, { params: filters })
            .then((response) => { if (active) setData(response.data); })
            .catch((requestError) => { if (active) setError(requestError.response?.data?.msg || 'Unable to load report'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [type, filters]);
    return { data, loading, error };
};

const Filters = ({ filters, setFilters, transaction = false }) => <div className="grid grid-cols-1 gap-3 border-b border-gray-100 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-5"><input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value, page: 1 })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" aria-label="Start date" /><input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value, page: 1 })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" aria-label="End date" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} placeholder="Search merchant or email" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />{transaction && <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value, page: 1 })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">All types</option><option value="CREDIT">Credit</option><option value="DEBIT">Debit</option></select>}{transaction && <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">All statuses</option>{['SUCCESS', 'PROCESSING', 'PENDING', 'FAILED', 'REVERSED'].map((status) => <option key={status} value={status}>{status}</option>)}</select>}</div>;
const State = ({ loading, error, empty, children }) => loading ? <p className="p-8 text-sm text-gray-500">Loading report data...</p> : error ? <div className="flex items-center gap-2 p-8 text-sm text-red-600"><XCircle className="h-4 w-4" />{error}</div> : empty ? <p className="p-8 text-center text-sm text-gray-500">No records match the selected filters.</p> : children;
const Metric = ({ label, value }) => <div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>;
const Pager = ({ data, setPage }) => data && data.total > data.limit ? <div className="flex items-center justify-between border-t border-gray-100 p-4 text-sm text-gray-500"><span>{data.total} total records</span><div className="flex items-center gap-3"><button type="button" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {data.page} of {Math.ceil(data.total / data.limit)}</span><button type="button" disabled={data.page >= Math.ceil(data.total / data.limit)} onClick={() => setPage(data.page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div> : null;
const ReportShell = ({ title, subtitle, filters, children }) => <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-gray-100 p-5"><div><h2 className="text-lg font-bold text-gray-900">{title}</h2><p className="mt-1 text-xs text-gray-400">{subtitle}</p></div><Filter className="h-4 w-4 text-gray-400" /></div>{filters}{children}</div>;

const TransactionReportsSection = () => {
    const [filters, setFilters] = useState({ startDate: '', endDate: '', search: '', type: '', status: '', page: 1, limit: 25 });
    const { data, loading, error } = useReport('transactions', filters);
    return <ReportShell title="Transaction Reports" subtitle="Ledger-backed transactions across all merchants." filters={<Filters filters={filters} setFilters={setFilters} transaction />}><div className="grid grid-cols-2 gap-3 border-b border-gray-100 p-4 sm:grid-cols-3"><Metric label="Transactions" value={data?.total || 0} /><Metric label="Total amount" value={formatCurrency(data?.totalAmount)} /><Metric label="Page" value={data?.page || 1} /></div><State loading={loading} error={error} empty={!data?.rows?.length}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Transaction ID', 'Date', 'Merchant', 'Type', 'Category', 'Amount', 'Status', 'Reference', 'Description'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{data?.rows.map((row) => <tr key={row._id}><td className="px-4 py-3 font-mono text-xs">{row.transactionId}</td><td className="whitespace-nowrap px-4 py-3">{new Date(row.createdAt).toLocaleString('en-IN')}</td><td className="px-4 py-3">{row.merchant?.email}</td><td className="px-4 py-3">{row.type}</td><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3 font-semibold">{formatCurrency(row.amount)}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3">{row.referenceId || '-'}</td><td className="max-w-xs truncate px-4 py-3">{row.description || '-'}</td></tr>)}</tbody></table></div></State><Pager data={data} setPage={(page) => setFilters({ ...filters, page })} /></ReportShell>;
};

const WalletReportsSection = () => {
    const [filters, setFilters] = useState({ startDate: '', endDate: '', search: '', page: 1, limit: 25 });
    const { data, loading, error } = useReport('wallets', filters);
    return <ReportShell title="Wallet Reports" subtitle="Authoritative wallet balances with ledger, funding, and payout summaries." filters={<Filters filters={filters} setFilters={setFilters} />}><div className="grid grid-cols-2 gap-3 border-b border-gray-100 p-4 sm:grid-cols-3"><Metric label="Merchants" value={data?.total || 0} /><Metric label="Page balance" value={formatCurrency(data?.totalAmount)} /></div><State loading={loading} error={error} empty={!data?.rows?.length}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Merchant', 'Available', 'Locked', 'Total payout', 'Funding', 'Successful payouts', 'Failed payouts', 'Updated'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{data?.rows.map((row) => <tr key={row.merchant._id}><td className="px-4 py-3">{row.merchant.email}</td><td className="px-4 py-3">{formatCurrency(row.availableBalance)}</td><td className="px-4 py-3">{formatCurrency(row.lockedBalance)}</td><td className="px-4 py-3">{formatCurrency(row.totalPayoutSent)}</td><td className="px-4 py-3">{formatCurrency(row.totalFunding)}</td><td className="px-4 py-3">{row.successfulPayouts}</td><td className="px-4 py-3">{row.failedPayouts}</td><td className="whitespace-nowrap px-4 py-3">{new Date(row.updatedAt).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div></State><Pager data={data} setPage={(page) => setFilters({ ...filters, page })} /></ReportShell>;
};

const APIUsageReportsSection = () => {
    const [filters, setFilters] = useState({ startDate: '', endDate: '', search: '', page: 1, limit: 25 });
    const { data, loading, error } = useReport('api-usage', filters);
    return <ReportShell title="API Usage Reports" subtitle="Persisted merchant API request metrics. Response time is shown only because it is recorded." filters={<Filters filters={filters} setFilters={setFilters} />}><div className="grid grid-cols-2 gap-3 border-b border-gray-100 p-4 sm:grid-cols-4"><Metric label="Requests" value={data?.summary?.total || 0} /><Metric label="Successful" value={data?.summary?.successful || 0} /><Metric label="Failed" value={data?.summary?.failed || 0} /><Metric label="Avg response" value={data?.summary?.avgResponseTimeMs == null ? 'Unavailable' : `${data.summary.avgResponseTimeMs} ms`} /></div><State loading={loading} error={error} empty={!data?.merchants?.length}><div className="grid gap-6 p-5 lg:grid-cols-2"><div><h3 className="mb-3 font-semibold text-gray-900">By merchant</h3>{data?.merchants.map((row) => <div key={row.merchant._id} className="flex justify-between border-b py-3 text-sm"><span>{row.merchant.email}</span><span>{row.requests} requests · {row.successful} successful</span></div>)}</div><div><h3 className="mb-3 font-semibold text-gray-900">By endpoint</h3>{data?.endpoints.map((row) => <div key={row._id} className="flex justify-between border-b py-3 text-sm"><span className="font-mono">{row._id}</span><span>{row.requests} requests</span></div>)}</div></div><div className="border-t p-5"><h3 className="mb-3 font-semibold text-gray-900">Status codes</h3><div className="flex flex-wrap gap-3 text-sm">{data?.statuses.map((row) => <span key={row._id} className="rounded-lg bg-gray-50 px-3 py-2">{row._id}: {row.requests}</span>)}</div></div></State></ReportShell>;
};

const ExportSection = () => {
    const [type, setType] = useState('transactions');
    const [format, setFormat] = useState('csv');
    const [filters, setFilters] = useState({ startDate: '', endDate: '', search: '', type: '', status: '' });
    const exportReport = async () => {
        try {
            const response = await apiClient.get('/admin/reports/export', { params: { ...filters, type, format }, responseType: 'blob' });
            const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `bluepay_${type}_report.${format}`; link.click(); URL.revokeObjectURL(url); toast.success('Report downloaded');
        } catch (error) { toast.error(error.response?.data?.msg || 'Unable to export report'); }
    };
    return <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-gray-900">Export CSV / PDF</h2><p className="mt-1 text-sm text-gray-500">Export the filtered report dataset from the database.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Report<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"><option value="transactions">Transactions</option><option value="wallets">Wallets</option><option value="api-usage">API usage</option></select></label><label className="text-sm font-semibold">Format<select value={format} onChange={(event) => setFormat(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"><option value="csv">CSV</option><option value="pdf">PDF</option></select></label><label className="text-sm font-semibold">Start date<input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold">End date<input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal" /></label></div><button type="button" onClick={exportReport} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-bold text-white"><FileDown className="h-4 w-4" />Export {format.toUpperCase()}</button></div>;
};

const Reports = ({ view }) => {
    const [tab, setTab] = useState(TABS.includes(view) ? view : 'Transaction Reports');
    useEffect(() => { if (TABS.includes(view)) setTab(view); }, [view]);
    return <div className="w-full space-y-6 pb-12"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl"><FileText className="h-7 w-7 text-blue-600" />Reports</h1><p className="mt-1 text-sm text-gray-500">Read-only reporting from BluePay database records.</p></div><div className="flex flex-wrap gap-2 rounded-xl bg-gray-100 p-1">{TABS.map((item) => <button type="button" key={item} onClick={() => setTab(item)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === item ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
    >
        {item}
    </button>)}
    </div>
        {tab === 'Transaction Reports' && <TransactionReportsSection />}
        {tab === 'Wallet Reports' && <WalletReportsSection />}
        {tab === 'API Usage Reports' && <APIUsageReportsSection />}
        {tab === 'Export CSV / PDF' && <ExportSection />}
    </div>;
};

export default Reports;
