import React, { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import {
    RefreshCw, Download, Search, ChevronLeft, ChevronRight,
    AlertTriangle, Inbox, CheckCircle2, XCircle,
} from 'lucide-react';

const PAGE_SIZE = 25;

const METHOD_STYLES = {
    GET: 'bg-blue-50 text-blue-700 border-blue-200',
    POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PUT: 'bg-amber-50 text-amber-700 border-amber-200',
    PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
};

const MethodBadge = ({ method }) => (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-semibold border ${METHOD_STYLES[method] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {method}
    </span>
);

const SuccessBadge = ({ success, statusCode }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${success ? 'text-emerald-700' : 'text-red-600'}`}>
        {success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {statusCode}
    </span>
);

const emptyData = { summary: {}, endpoints: [], merchants: [], dates: [], statuses: [], rows: [], total: 0 };

const ApiUsage = () => {
    const [data, setData] = useState(emptyData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [method, setMethod] = useState('');
    const [success, setSuccess] = useState('');
    const [environment, setEnvironment] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

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
            const response = await apiClient.get('/admin/reports/api-usage', {
                params: {
                    page,
                    limit: PAGE_SIZE,
                    search: search || undefined,
                    method: method || undefined,
                    success: success || undefined,
                    environment: environment || undefined,
                    startDate: dateFrom || undefined,
                    endDate: dateTo || undefined,
                },
            });
            setData(response.data);
        } catch (err) {
            if (err?.isCanceled) return;
            setError(err.response?.data?.msg || 'Unable to load API usage');
        } finally {
            setLoading(false);
        }
    }, [page, search, method, success, environment, dateFrom, dateTo]);

    useEffect(() => { load(); }, [load]);

    const exportCsv = async () => {
        try {
            const response = await apiClient.get('/admin/reports/export', {
                params: { type: 'api-usage', format: 'csv' },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'bluepay_api-usage_report.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to export report');
        }
    };

    const summary = data.summary || {};
    const successRate = summary.total ? Math.round((summary.successful / summary.total) * 100) : 0;
    const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));
    const hasActiveFilters = search || method || success || environment || dateFrom || dateTo;
    const maxDailyRequests = Math.max(1, ...(data.dates || []).map((d) => d.requests));

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-6 gap-4">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">API Usage</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search endpoint, request ID, merchant..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">All methods</option>
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={success} onChange={(e) => { setSuccess(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">All statuses</option>
                        <option value="true">Successful</option>
                        <option value="false">Failed</option>
                    </select>
                    <select value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">All environments</option>
                        <option value="live">Live</option>
                        <option value="test">Test</option>
                    </select>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600" title="From date" />
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600" title="To date" />
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearchInput(''); setSearch(''); setMethod(''); setSuccess(''); setEnvironment(''); setDateFrom(''); setDateTo(''); setPage(1); }}
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

            {error ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-2 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-sm">{error}</span>
                    <button onClick={load} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                </div>
            ) : (
                <>
                    {/* Overview cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-gray-400 uppercase font-medium">Total Requests</div>
                            <div className="text-2xl font-semibold text-gray-900 mt-1">{(summary.total || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-gray-400 uppercase font-medium">Successful</div>
                            <div className="text-2xl font-semibold text-emerald-600 mt-1">{(summary.successful || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-gray-400 uppercase font-medium">Failed</div>
                            <div className="text-2xl font-semibold text-red-500 mt-1">{(summary.failed || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-gray-400 uppercase font-medium">Success Rate</div>
                            <div className="text-2xl font-semibold text-gray-900 mt-1">{summary.total ? `${successRate}%` : '—'}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-gray-400 uppercase font-medium">Avg Response Time</div>
                            <div className="text-2xl font-semibold text-gray-900 mt-1">{summary.avgResponseTimeMs != null ? `${summary.avgResponseTimeMs} ms` : '—'}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-gray-400 uppercase font-medium">Requests Today</div>
                            <div className="text-2xl font-semibold text-gray-900 mt-1">{(summary.todayTotal || 0).toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    {/* Analytics */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                        <div className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-medium text-gray-900 mb-1">Requests Over Time</h2>
                            <p className="text-xs text-gray-400 mb-4">Daily volume for the selected filters/date range</p>
                            {loading ? (
                                <div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading...</div>
                            ) : (data.dates || []).length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center gap-2 text-gray-400">
                                    <Inbox className="w-5 h-5" /> No API activity in this range
                                </div>
                            ) : (
                                <div className="flex items-end justify-between gap-1.5 h-40">
                                    {data.dates.map((d) => (
                                        <div key={d._id} className="flex flex-col items-center flex-1 h-full justify-end group">
                                            <span className="text-[10px] text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{d.requests}</span>
                                            <div
                                                className="w-full rounded-t-sm bg-gradient-to-t from-blue-300 to-blue-600"
                                                style={{ height: `${Math.max(4, (d.requests / maxDailyRequests) * 100)}%` }}
                                            />
                                            <span className="text-[9px] text-gray-400 mt-2 rotate-0 whitespace-nowrap">{d._id.slice(5)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-medium text-gray-900 mb-1">Status Code Breakdown</h2>
                            <p className="text-xs text-gray-400 mb-4">Across all matching requests</p>
                            {loading ? (
                                <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
                            ) : (data.statuses || []).length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center gap-2 text-gray-400">
                                    <Inbox className="w-5 h-5" /> No data
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {data.statuses.map((s) => {
                                        const max = Math.max(1, ...data.statuses.map((x) => x.requests));
                                        const isError = s._id >= 400;
                                        return (
                                            <div key={s._id}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className={`font-mono font-semibold ${isError ? 'text-red-600' : 'text-emerald-600'}`}>{s._id}</span>
                                                    <span className="text-gray-400">{s.requests}</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(s.requests / max) * 100}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 font-medium text-gray-700">Top Endpoints</div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-2">Endpoint</th>
                                        <th className="text-right px-5 py-2">Requests</th>
                                        <th className="text-right px-5 py-2">Successful</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={3} className="text-center py-8 text-gray-400">Loading...</td></tr>
                                    ) : (data.endpoints || []).length === 0 ? (
                                        <tr><td colSpan={3} className="text-center py-8 text-gray-400">No data</td></tr>
                                    ) : data.endpoints.slice(0, 15).map((row) => (
                                        <tr key={row._id}>
                                            <td className="px-5 py-2 text-gray-700 font-mono text-xs">{row._id}</td>
                                            <td className="px-5 py-2 text-right text-gray-900">{row.requests}</td>
                                            <td className="px-5 py-2 text-right text-emerald-600">{row.successful}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 font-medium text-gray-700">API Usage by Merchant</div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-2">Merchant</th>
                                        <th className="text-right px-5 py-2">Requests</th>
                                        <th className="text-right px-5 py-2">Successful</th>
                                        <th className="text-right px-5 py-2">Failed</th>
                                        <th className="text-right px-5 py-2">Success Rate</th>
                                        <th className="text-right px-5 py-2">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                                    ) : (data.merchants || []).length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">No data</td></tr>
                                    ) : data.merchants.slice(0, 15).map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="px-5 py-2 text-gray-700">
                                                <div className="font-medium">{row.merchant?.name}</div>
                                                <div className="text-xs text-gray-400">{row.merchant?.email}</div>
                                            </td>
                                            <td className="px-5 py-2 text-right text-gray-900">{row.requests}</td>
                                            <td className="px-5 py-2 text-right text-emerald-600">{row.successful}</td>
                                            <td className="px-5 py-2 text-right text-red-500">{row.requests - row.successful}</td>
                                            <td className="px-5 py-2 text-right text-gray-700">{row.requests ? Math.round((row.successful / row.requests) * 100) : 0}%</td>
                                            <td className="px-5 py-2 text-right text-gray-500">{row.avgResponseTimeMs != null ? `${Math.round(row.avgResponseTimeMs)} ms` : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Raw request table */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 font-medium text-gray-700">API Requests</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-3">Date/Time</th>
                                        <th className="text-left px-5 py-3">Merchant</th>
                                        <th className="text-left px-5 py-3">Method</th>
                                        <th className="text-left px-5 py-3">Endpoint</th>
                                        <th className="text-left px-5 py-3">Status</th>
                                        <th className="text-right px-5 py-3">Response Time</th>
                                        <th className="text-left px-5 py-3">Environment</th>
                                        <th className="text-left px-5 py-3">Request ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading requests...</td></tr>
                                    ) : (data.rows || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-14">
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <Inbox className="w-6 h-6" />
                                                    <span>No API requests found</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : data.rows.map((row) => (
                                        <tr key={row._id} className="hover:bg-gray-50/60">
                                            <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                                            <td className="px-5 py-3 text-gray-700">
                                                <div className="font-medium">{row.merchant?.name || '—'}</div>
                                                <div className="text-xs text-gray-400">{row.merchant?.email}</div>
                                            </td>
                                            <td className="px-5 py-3"><MethodBadge method={row.method} /></td>
                                            <td className="px-5 py-3 text-gray-700 font-mono text-xs">{row.endpoint}</td>
                                            <td className="px-5 py-3"><SuccessBadge success={row.success} statusCode={row.statusCode} /></td>
                                            <td className="px-5 py-3 text-right text-gray-600">{row.durationMs} ms</td>
                                            <td className="px-5 py-3 text-gray-500 capitalize">{row.environment || '—'}</td>
                                            <td className="px-5 py-3 text-gray-400 font-mono text-xs">{row.requestId || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                            <span>Page {page} of {totalPages} · {(data.total || 0).toLocaleString('en-IN')} request{data.total === 1 ? '' : 's'}</span>
                            <div className="flex items-center gap-2">
                                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Layout>
    );
};

export default ApiUsage;
