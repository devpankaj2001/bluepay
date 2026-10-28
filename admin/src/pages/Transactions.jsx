import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import {
    Search, RefreshCw, ChevronLeft, ChevronRight, Download,
    AlertTriangle, Inbox, X, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';

const STATUS_STYLES = {
    SUCCESS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200',
    FAILED: 'bg-red-100 text-red-700 border-red-200',
    REVERSED: 'bg-purple-100 text-purple-700 border-purple-200',
};

const TYPE_ICONS = {
    CREDIT: <ArrowDownLeft className="w-3.5 h-3.5" />,
    DEBIT: <ArrowUpRight className="w-3.5 h-3.5" />,
};

const StatusBadge = ({ status }) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {status}
    </span>
);

const REFERENCE_LABELS = {
    FundRequest: 'Fund Request',
    Payout: 'Payout',
    CCAvenue: 'CCAvenue Order',
    Kotak: 'Kotak Reference',
    Manual: 'Manual Adjustment',
};

const PAGE_SIZE = 25;

const Transactions = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const requestedTransactionId = location.state?.transactionId;
    const [data, setData] = useState({ rows: [], total: 0, totalAmount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchInput, setSearchInput] = useState(requestedTransactionId || '');
    const [search, setSearch] = useState(requestedTransactionId || '');
    const [type, setType] = useState('');
    const [status, setStatus] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const debounceRef = useRef(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchInput]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/admin/reports/transactions', {
                params: {
                    page,
                    limit: PAGE_SIZE,
                    search: search || undefined,
                    type: type || undefined,
                    status: status || undefined,
                    startDate: dateFrom || undefined,
                    endDate: dateTo || undefined,
                },
            });
            setData(response.data);
        } catch (err) {
            if (err?.isCanceled) return;
            setError(err.response?.data?.msg || 'Unable to load transactions');
        } finally {
            setLoading(false);
        }
    }, [page, search, type, status, dateFrom, dateTo]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!requestedTransactionId) return;
        const requestedRow = (data.rows || []).find((row) => row.transactionId === requestedTransactionId);
        if (!requestedRow) return;

        setSelected(requestedRow);
        navigate('/transactions', { replace: true, state: null });
    }, [data.rows, navigate, requestedTransactionId]);

    // Keep an open details modal in sync with a fresh reload instead of
    // showing stale data.
    useEffect(() => {
        if (!selected) return;
        const updated = (data.rows || []).find((r) => r._id === selected._id);
        if (updated) setSelected(updated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.rows, selected?._id]);

    const exportCsv = async () => {
        try {
            const response = await apiClient.get('/admin/reports/export', {
                params: { type: 'transactions', format: 'csv', search: search || undefined },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'bluepay_transactions_report.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to export report');
        }
    };

    const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));
    const hasActiveFilters = search || type || status || dateFrom || dateTo;

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-6 gap-4">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Transactions</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search txn ID, reference, UTR, merchant..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">All types</option>
                        <option value="CREDIT">Credit</option>
                        <option value="DEBIT">Debit</option>
                    </select>
                    <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">All statuses</option>
                        {Object.keys(STATUS_STYLES).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600" title="From date" />
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600" title="To date" />
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearchInput(''); setSearch(''); setType(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                            Clear filters
                        </button>
                    )}
                    <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={load} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase font-medium">Total Records</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">{(data.total || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase font-medium">Total Amount</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">₹{(data.totalAmount || 0).toLocaleString('en-IN')}</div>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                        <span className="text-sm">{error}</span>
                        <button onClick={load} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-3">Date</th>
                                        <th className="text-left px-5 py-3">Transaction ID</th>
                                        <th className="text-left px-5 py-3">Merchant</th>
                                        <th className="text-left px-5 py-3">Type</th>
                                        <th className="text-left px-5 py-3">Category</th>
                                        <th className="text-right px-5 py-3">Amount</th>
                                        <th className="text-left px-5 py-3">Status</th>
                                        <th className="text-right px-5 py-3">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading transactions...</td></tr>
                                    ) : (data.rows || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-14">
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <Inbox className="w-6 h-6" />
                                                    <span>No transactions found</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : data.rows.map((row) => (
                                        <tr key={row._id} className="hover:bg-gray-50/60">
                                            <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                                            <td className="px-5 py-3 text-gray-600 font-mono text-xs">{row.transactionId}</td>
                                            <td className="px-5 py-3 text-gray-700">
                                                <div className="font-medium">{row.merchant?.name}</div>
                                                <div className="text-xs text-gray-400">{row.merchant?.email}</div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">
                                                <span className="inline-flex items-center gap-1">{TYPE_ICONS[row.type]} {row.type}</span>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">{row.category}</td>
                                            <td className="px-5 py-3 text-right font-medium text-gray-900">₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                                            <td className="px-5 py-3 text-right">
                                                <button onClick={() => setSelected(row)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition text-xs font-bold">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                            <span>Page {page} of {totalPages}</span>
                            <div className="flex items-center gap-2">
                                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Details Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-1">
                            <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
                            <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-5 font-mono">{selected.transactionId}</p>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div className="border border-gray-100 rounded-xl p-3">
                                <div className="text-xs text-gray-400 uppercase">Merchant</div>
                                <div className="font-medium text-gray-800">{selected.merchant?.name}</div>
                                <div className="text-xs text-gray-400">{selected.merchant?.email}</div>
                            </div>
                            <div className="border border-gray-100 rounded-xl p-3">
                                <div className="text-xs text-gray-400 uppercase">Amount</div>
                                <div className="font-semibold text-gray-900">₹{Number(selected.amount || 0).toLocaleString('en-IN')}</div>
                            </div>
                            <div className="border border-gray-100 rounded-xl p-3">
                                <div className="text-xs text-gray-400 uppercase">Type</div>
                                <div className="font-medium text-gray-800 flex items-center gap-1">{TYPE_ICONS[selected.type]} {selected.type}</div>
                            </div>
                            <div className="border border-gray-100 rounded-xl p-3">
                                <div className="text-xs text-gray-400 uppercase">Category</div>
                                <div className="font-medium text-gray-800">{selected.category}</div>
                            </div>
                            <div className="border border-gray-100 rounded-xl p-3">
                                <div className="text-xs text-gray-400 uppercase">Status</div>
                                <div className="mt-1"><StatusBadge status={selected.status} /></div>
                            </div>
                            <div className="border border-gray-100 rounded-xl p-3">
                                <div className="text-xs text-gray-400 uppercase">Date & Time</div>
                                <div className="font-medium text-gray-800">{new Date(selected.createdAt).toLocaleString('en-IN')}</div>
                            </div>
                        </div>

                        {selected.referenceId && (
                            <div className="border border-gray-100 rounded-xl p-3 mb-4 text-sm">
                                <div className="text-xs text-gray-400 uppercase mb-1">Related {REFERENCE_LABELS[selected.referenceType] || 'Reference'}</div>
                                <div className="font-mono text-gray-700 text-xs break-all">{selected.referenceId}</div>
                            </div>
                        )}

                        {selected.metadata?.utr && (
                            <div className="border border-gray-100 rounded-xl p-3 mb-4 text-sm">
                                <div className="text-xs text-gray-400 uppercase mb-1">UTR</div>
                                <div className="font-mono text-gray-700">{selected.metadata.utr}</div>
                            </div>
                        )}

                        {selected.description && (
                            <div className="border border-gray-100 rounded-xl p-3 text-sm">
                                <div className="text-xs text-gray-400 uppercase mb-1">Description</div>
                                <div className="text-gray-700">{selected.description}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Transactions;
