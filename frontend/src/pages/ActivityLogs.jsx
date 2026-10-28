import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, User, Globe, LogIn, Search, MapPin, Monitor, ShieldAlert, CheckCircle, XCircle,
    RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, Inbox,
} from 'lucide-react';
import apiClient from '../api/apiClient';

const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

// ------------------------------------------------------------
// Shared data hook - every tab talks to its own /api/activity/* endpoint
// through the exact same fetch/paginate/filter contract.
// ------------------------------------------------------------

const useActivityFeed = (path) => {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);

        try {
            const params = { page, limit: 20 };
            if (search.trim()) params.search = search.trim();
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;
            if (status !== 'all') params.status = status;

            const { data: resp } = await apiClient.get(path, { params });
            setData(Array.isArray(resp.data) ? resp.data : []);
            setPagination(resp.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
        } catch (err) {
            if (err?.isCanceled) return;
            setError(true);
            setData([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, page, status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const applySearch = () => {
        setPage(1);
        fetchData();
    };

    return {
        data, pagination, loading, error,
        search, setSearch, dateFrom, setDateFrom, dateTo, setDateTo, status, setStatus,
        page, setPage, refresh: fetchData, applySearch,
    };
};

// ------------------------------------------------------------
// Shared toolbar (search + date range + status filter + refresh)
// ------------------------------------------------------------

const Toolbar = ({ feed, statusOptions, searchPlaceholder }) => (
    <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
                value={feed.search}
                onChange={(e) => feed.setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && feed.applySearch()}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <input
                type="date"
                value={feed.dateFrom}
                onChange={(e) => feed.setDateFrom(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
                type="date"
                value={feed.dateTo}
                onChange={(e) => feed.setDateTo(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            {statusOptions && (
                <select
                    value={feed.status}
                    onChange={(e) => { feed.setPage(1); feed.setStatus(e.target.value); }}
                    className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                    <option value="all">All Status</option>
                    {statusOptions.map((s) => (
                        <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                </select>
            )}

            <button
                onClick={feed.applySearch}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
            >
                Apply
            </button>

            <button
                onClick={feed.refresh}
                className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="Refresh"
            >
                <RefreshCw className={`w-4 h-4 ${feed.loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
    </div>
);

// ------------------------------------------------------------
// Shared pagination footer
// ------------------------------------------------------------

const PaginationFooter = ({ feed }) => {
    const { page, pagination } = feed;
    if (!pagination.total) return null;

    return (
        <div className="p-4 flex items-center justify-between border-t border-gray-100">
            <p className="text-xs text-gray-400">
                Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total
            </p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => feed.setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => feed.setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page >= pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// Shared loading / error / empty states
// ------------------------------------------------------------

const FeedState = ({ feed, emptyIcon, emptyText = 'No activity found.' }) => {
    const EmptyIcon = emptyIcon || Inbox;

    if (feed.loading) {
        return (
            <div className="py-14 text-center">
                <RefreshCw className="w-6 h-6 text-gray-300 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-gray-400">Loading...</p>
            </div>
        );
    }

    if (feed.error) {
        return (
            <div className="py-14 text-center">
                <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Failed to load activity</p>
                <button onClick={feed.refresh} className="text-xs text-blue-600 font-semibold mt-2 hover:text-blue-700">
                    Try again
                </button>
            </div>
        );
    }

    if (!feed.data.length) {
        return (
            <div className="py-14 text-center">
                <EmptyIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-500">{emptyText}</p>
            </div>
        );
    }

    return null;
};

// ------------------------------------------------------------
// User Activity Section
// ------------------------------------------------------------

const ActionStatusPill = ({ status }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${status === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
        {status === 'SUCCESS' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {status === 'SUCCESS' ? 'Success' : 'Failed'}
    </span>
);

const UserActivitySection = () => {
    const feed = useActivityFeed('/activity/user');

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">User Activity</h2>
                <p className="text-xs text-gray-400 mt-1">Actions performed on your account</p>
            </div>
            <Toolbar feed={feed} statusOptions={['SUCCESS', 'FAILED']} searchPlaceholder="Search action, description..." />
            <FeedState feed={feed} emptyIcon={User} />
            {!feed.loading && !feed.error && feed.data.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-xs text-gray-500">
                                <th className="px-5 py-3 font-semibold">Action</th>
                                <th className="px-5 py-3 font-semibold">Description</th>
                                <th className="px-5 py-3 font-semibold">Resource</th>
                                <th className="px-5 py-3 font-semibold">Status</th>
                                <th className="px-5 py-3 font-semibold">IP</th>
                                <th className="px-5 py-3 font-semibold">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {feed.data.map((a) => (
                                <tr key={a._id} className="hover:bg-gray-50 transition">
                                    <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-600">{a.action}</td>
                                    <td className="px-5 py-4 text-gray-700">{a.description || '-'}</td>
                                    <td className="px-5 py-4 text-xs text-gray-500">{a.resourceType || '-'}</td>
                                    <td className="px-5 py-4"><ActionStatusPill status={a.status} /></td>
                                    <td className="px-5 py-4 text-xs text-gray-500 font-mono">{a.ipAddress || '-'}</td>
                                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <PaginationFooter feed={feed} />
        </div>
    );
};

// ------------------------------------------------------------
// API Activity Section
// ------------------------------------------------------------

const APIActivitySection = () => {
    const feed = useActivityFeed('/activity/api');

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">API Activity</h2>
                <p className="text-xs text-gray-400 mt-1">Recent API requests made to your account</p>
            </div>
            <Toolbar feed={feed} statusOptions={['SUCCESS', 'FAILED']} searchPlaceholder="Search endpoint, method..." />
            <FeedState feed={feed} emptyIcon={Globe} />
            {!feed.loading && !feed.error && feed.data.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-xs text-gray-500">
                                <th className="px-5 py-3 font-semibold">Method</th>
                                <th className="px-5 py-3 font-semibold">Endpoint</th>
                                <th className="px-5 py-3 font-semibold">Status</th>
                                <th className="px-5 py-3 font-semibold">Response Time</th>
                                <th className="px-5 py-3 font-semibold">Environment</th>
                                <th className="px-5 py-3 font-semibold">IP</th>
                                <th className="px-5 py-3 font-semibold">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {feed.data.map((a) => (
                                <tr key={a._id} className="hover:bg-gray-50 transition">
                                    <td className="px-5 py-4 font-mono text-xs font-bold text-gray-700">{a.method || '-'}</td>
                                    <td className="px-5 py-4 font-mono text-xs text-gray-700">{a.endpoint || '-'}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${a.statusCode && a.statusCode < 400 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                            {a.statusCode && a.statusCode < 400 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {a.statusCode ?? '-'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-gray-500">{a.responseTime != null ? `${a.responseTime} ms` : '-'}</td>
                                    <td className="px-5 py-4 text-xs text-gray-500 capitalize">{a.environment || '-'}</td>
                                    <td className="px-5 py-4 text-xs text-gray-500 font-mono">{a.ipAddress || '-'}</td>
                                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <PaginationFooter feed={feed} />
        </div>
    );
};

// ------------------------------------------------------------
// Login History Section
// ------------------------------------------------------------

const LoginHistorySection = () => {
    const feed = useActivityFeed('/activity/login');

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Login History</h2>
                <p className="text-xs text-gray-400 mt-1">Recent sign-ins to your account</p>
            </div>
            <Toolbar feed={feed} statusOptions={['SUCCESS', 'FAILED']} searchPlaceholder="Search IP, device..." />
            <FeedState feed={feed} emptyIcon={LogIn} />
            {!feed.loading && !feed.error && feed.data.length > 0 && (
                <div className="divide-y divide-gray-100">
                    {feed.data.map((l) => (
                        <div key={l._id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${l.status === 'SUCCESS' ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <LogIn className={`w-4 h-4 ${l.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                        <Monitor className="w-3.5 h-3.5 text-gray-400" /> {l.userAgent || 'Unknown device'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {l.ipAddress || 'Unknown IP'} &middot; {formatDateTime(l.createdAt)}
                                    </p>
                                    {l.status === 'FAILED' && l.failureReason && (
                                        <p className="text-xs text-red-500 mt-0.5">{l.failureReason}</p>
                                    )}
                                </div>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${l.status === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {l.status === 'SUCCESS' ? 'Successful' : 'Failed'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            <PaginationFooter feed={feed} />
        </div>
    );
};

// ------------------------------------------------------------
// IP Logs Section
// ------------------------------------------------------------

const IPLogsSection = () => {
    const feed = useActivityFeed('/activity/ip');

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">IP Logs</h2>
                <p className="text-xs text-gray-400 mt-1">IP addresses that have accessed your account</p>
            </div>
            <Toolbar feed={feed} searchPlaceholder="Search IP address..." />
            <FeedState feed={feed} emptyIcon={ShieldAlert} />
            {!feed.loading && !feed.error && feed.data.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-xs text-gray-500">
                                <th className="px-5 py-3 font-semibold">IP Address</th>
                                <th className="px-5 py-3 font-semibold">Source</th>
                                <th className="px-5 py-3 font-semibold">First Seen</th>
                                <th className="px-5 py-3 font-semibold">Last Seen</th>
                                <th className="px-5 py-3 font-semibold">Activity Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {feed.data.map((i) => (
                                <tr key={`${i.ipAddress}-${i.source}`} className="hover:bg-gray-50 transition">
                                    <td className="px-5 py-4 font-mono text-xs text-gray-700 flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5 text-gray-400" /> {i.ipAddress}
                                    </td>
                                    <td className="px-5 py-4 text-gray-600">{i.source}</td>
                                    <td className="px-5 py-4 text-xs text-gray-500">{formatDateTime(i.firstSeen)}</td>
                                    <td className="px-5 py-4 text-xs text-gray-500">{formatDateTime(i.lastSeen)}</td>
                                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{Number(i.count || 0).toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <PaginationFooter feed={feed} />
        </div>
    );
};

// ------------------------------------------------------------
// ActivityLogs (module entry)
// ------------------------------------------------------------

const TABS = ['User Activity', 'API Activity', 'Login History', 'IP Logs'];

const ActivityLogs = ({ view, onNavigate }) => {
    const active = TABS.includes(view) ? view : 'User Activity';

    const setTab = (t) => {
        if (onNavigate) onNavigate(t);
    };

    return (
        <div className="w-full pb-12 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-7 h-7 text-blue-600" /> Activity Logs
                </h1>
                <p className="text-sm text-gray-500 mt-1">Track account, API, and login activity.</p>
            </div>

            <div className="flex flex-wrap gap-2 bg-gray-100 rounded-xl p-1 w-fit">
                {TABS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${active === t
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:text-blue-600 shadow-sm'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {active === 'User Activity' && <UserActivitySection />}
            {active === 'API Activity' && <APIActivitySection />}
            {active === 'Login History' && <LoginHistorySection />}
            {active === 'IP Logs' && <IPLogsSection />}
        </div>
    );
};

export default ActivityLogs;
