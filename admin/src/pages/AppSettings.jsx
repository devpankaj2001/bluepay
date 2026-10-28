import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Eye, Pencil, Search, Trash2,
} from 'lucide-react';
import Layout from '../components/Layout';
import transactionLogMockData from './transactionLogMockData';

const PAGE_SIZE = 25;

const API_CREDENTIALS = [
    { name: 'Kotak_API_ID', status: 'Active' },
    { name: 'Kotak_API_Secret', status: 'Active' },
    { name: 'Kotak_Client_id', status: 'Active' },
].map((credential) => ({
    ...credential,
    createdDate: '02 Oct 2026, 11:30 AM',
    expiryDate: '02 Oct 2027, 11:30 AM',
}));

const STATUS_STYLES = {
    SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    FAILED: 'border-red-200 bg-red-50 text-red-700',
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
    PROCESSING: 'border-blue-200 bg-blue-50 text-blue-700',
    REVERSED: 'border-purple-200 bg-purple-50 text-purple-700',
};

const maskUserName = (value) => {
    const name = String(value || '').trim();
    if (!name) return '—';
    if (name.includes('XXXX')) return name;

    const parts = name.split(/\s+/);
    if (parts.length === 1) return `${parts[0].slice(0, 2)}XXXX`;
    return `${parts[0]}XXXX${parts.slice(1).join('').slice(0, 4)}XXXX`;
};

const maskAccountNumber = (value) => {
    const accountNumber = String(value || '').trim();
    if (!accountNumber) return '—';
    if (/^[Xx]{8}\d{4}$/.test(accountNumber)) return accountNumber.toUpperCase();

    const digits = accountNumber.replace(/\D/g, '');
    return digits.length >= 4 ? `XXXXXXXX${digits.slice(-4)}` : '—';
};

const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(date).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
};

const formatAmount = (amount, type) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '—';
    const sign = type === 'CREDIT' ? '+' : type === 'DEBIT' ? '-' : '';
    return `${sign} ₹${Math.abs(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const displayLabel = (value) => {
    const text = String(value || '');
    return text ? `${text[0]}${text.slice(1).toLowerCase()}` : '—';
};

const AppSettings = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('app-settings');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const visibleCredentials = useMemo(() => {
        const query = searchInput.trim().toLowerCase();
        return API_CREDENTIALS.filter((credential) => credential.name.toLowerCase().includes(query));
    }, [searchInput]);

    const filteredTransactions = useMemo(() => {
        const query = search.toLowerCase();
        if (!query) return transactionLogMockData;
        return transactionLogMockData.filter((row) => [
            row.transactionId,
            row.userName,
            row.email,
            row.accountNumber,
            row.type,
            row.amount,
            row.status,
            row.paymentMethod,
            row.description,
            row.createdAt,
        ].some((value) => String(value).toLowerCase().includes(query)));
    }, [search]);

    const total = filteredTransactions.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const visibleTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const isTransactionTab = activeTab === 'transactions';

    return (
        <Layout>
            <div className="mt-8 mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-medium tracking-tight text-gray-900">
                    {isTransactionTab ? 'Transaction Logs' : 'App Settings'}
                </h1>
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder={isTransactionTab ? 'Search transactions...' : 'Search'}
                        aria-label={isTransactionTab ? 'Search transactions' : 'Search API credentials'}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                </div>
            </div>

            <div className="mb-5 flex gap-6 border-b border-gray-200" role="tablist" aria-label="App settings sections">
                <button
                    type="button"
                    role="tab"
                    aria-selected={!isTransactionTab}
                    onClick={() => { setActiveTab('app-settings'); setSearchInput(''); setSearch(''); }}
                    className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition ${
                        !isTransactionTab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    App Settings
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={isTransactionTab}
                    onClick={() => { setActiveTab('transactions'); setSearchInput(''); setSearch(''); }}
                    className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition ${
                        isTransactionTab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Transaction Logs
                </button>
            </div>

            {!isTransactionTab ? (
                <section aria-labelledby="api-credentials-heading">
                    <h2 id="api-credentials-heading" className="mb-4 text-lg font-semibold text-gray-900">API Credentials</h2>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="min-w-[760px] w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-5 py-3.5">Name</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Created Date</th>
                                    <th className="px-5 py-3.5">Expiry Date</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visibleCredentials.length ? visibleCredentials.map((credential) => (
                                    <tr key={credential.name} className="text-gray-700">
                                        <td className="px-5 py-4 font-medium text-gray-900">{credential.name}</td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                {credential.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4">{credential.createdDate}</td>
                                        <td className="whitespace-nowrap px-5 py-4">{credential.expiryDate}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled
                                                    title="Credentials are managed by server configuration"
                                                    aria-label={`Edit ${credential.name}`}
                                                    className="rounded-md border border-gray-200 p-2 text-gray-400"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled
                                                    title="Credentials are managed by server configuration"
                                                    aria-label={`Delete ${credential.name}`}
                                                    className="rounded-md border border-gray-200 p-2 text-gray-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="px-5 py-10 text-center text-sm text-gray-500">No credentials match your search.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                <section aria-label="Transaction logs">
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <table className="min-w-[1450px] w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3.5">ID</th>
                                        <th className="px-4 py-3.5">User</th>
                                        <th className="px-4 py-3.5">Email</th>
                                        <th className="px-4 py-3.5">Account No.</th>
                                        <th className="px-4 py-3.5">Type</th>
                                        <th className="px-4 py-3.5 text-right">Amount</th>
                                        <th className="px-4 py-3.5">Status</th>
                                        <th className="px-4 py-3.5">Payment Method</th>
                                        <th className="px-4 py-3.5">Description</th>
                                        <th className="px-4 py-3.5">Date &amp; Time</th>
                                        <th className="px-4 py-3.5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {visibleTransactions.length ? visibleTransactions.map((row) => {
                                        const status = String(row.status || '').toUpperCase();
                                        const type = String(row.type || '').toUpperCase();
                                        return (
                                            <tr key={row._id || row.transactionId} className="text-gray-600 hover:bg-gray-50/70">
                                                <td className="max-w-36 truncate px-4 py-3.5 font-mono text-xs text-gray-700" title={row.transactionId}>{row.transactionId || '—'}</td>
                                                <td className="whitespace-nowrap px-4 py-3.5 font-medium text-gray-800">{maskUserName(row.userName)}</td>
                                                <td className="px-4 py-3.5">{row.email || '—'}</td>
                                                <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs">{maskAccountNumber(row.accountNumber)}</td>
                                                <td className="px-4 py-3.5">{displayLabel(type)}</td>
                                                <td className={`whitespace-nowrap px-4 py-3.5 text-right font-semibold ${type === 'CREDIT' ? 'text-emerald-700' : type === 'DEBIT' ? 'text-red-700' : 'text-gray-700'}`}>
                                                    {formatAmount(row.amount, type)}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] || 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                                                        {displayLabel(status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">{row.paymentMethod || '—'}</td>
                                                <td className="max-w-56 truncate px-4 py-3.5" title={row.description}>{row.description || '—'}</td>
                                                <td className="whitespace-nowrap px-4 py-3.5">{formatDateTime(row.createdAt)}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/transactions', { state: { transactionId: row.transactionId } })}
                                                        aria-label={`View transaction ${row.transactionId}`}
                                                        title="View transaction details"
                                                        className="rounded-md border border-gray-200 p-2 text-gray-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan="11" className="px-4 py-12 text-center text-sm text-gray-500">No transactions found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>{total.toLocaleString('en-IN')} transaction{total === 1 ? '' : 's'}</span>
                        <div className="flex items-center justify-end gap-2">
                            <span className="mr-2">Page {Math.min(page, totalPages)} of {totalPages}</span>
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((currentPage) => currentPage - 1)}
                                aria-label="Previous page"
                                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((currentPage) => currentPage + 1)}
                                aria-label="Next page"
                                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </Layout>
    );
};

export default AppSettings;
