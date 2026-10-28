import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Activity,
    Search,
    RefreshCw,
    Copy,
    Check,
    Clock,
    ShieldCheck,
    AlertCircle,
    X,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    FileText,
    Database,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';

const TABS = [
    { id: 'KOTAK_API', label: 'Kotak Bank API Logs (Point 29 Compliance)' },
    { id: 'USER_ACTIVITY', label: 'User Activity' },
    { id: 'LOGIN_HISTORY', label: 'Login History' },
    { id: 'ALL', label: 'All Activity Records' },
];

const formatJsonPreview = (val) => {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'string') return val;
    try {
        return JSON.stringify(val, null, 2);
    } catch {
        return String(val);
    }
};

const ActivityLogs = () => {
    const [activeTab, setActiveTab] = useState('KOTAK_API');
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [copiedId, setCopiedId] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: 1,
                limit: 100,
                type: activeTab,
            };
            if (statusFilter !== 'ALL') {
                params.status = statusFilter;
            }
            const res = await apiClient.get('/admin/kotak-api-logs', { params });
            const data = res.data?.logs || [];
            setLogs(Array.isArray(data) ? data : []);
            setTotal(res.data?.total || 0);
        } catch (err) {
            console.error('Failed to load activity logs:', err);
            setError(err.response?.data?.msg || 'Failed to load activity logs from server.');
            setLogs([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [activeTab, statusFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Client-side quick filter on already-fetched real records
    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return logs;
        const q = searchQuery.toLowerCase();
        return logs.filter((log) => {
            return (
                (log.requestId && String(log.requestId).toLowerCase().includes(q)) ||
                (log.messageId && String(log.messageId).toLowerCase().includes(q)) ||
                (log.endpoint && String(log.endpoint).toLowerCase().includes(q)) ||
                (log.action && String(log.action).toLowerCase().includes(q)) ||
                (log.description && String(log.description).toLowerCase().includes(q))
            );
        });
    }, [logs, searchQuery]);

    // Summary counts based on real logs
    const stats = useMemo(() => {
        const successCount = logs.filter((l) => l.applicationStatus === 'SUCCESS').length;
        const failedCount = logs.filter((l) => l.applicationStatus === 'FAILED').length;
        const validLatencies = logs.map((l) => l.durationMs).filter((d) => typeof d === 'number' && d > 0);
        const avgLatency = validLatencies.length
            ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
            : 0;
        return {
            total: logs.length,
            success: successCount,
            failed: failedCount,
            avgLatency,
        };
    }, [logs]);

    return (
        <Layout>
            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Activity & Audit Logs</h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                Point 29 Compliant
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            End-to-End API activity, Kotak Bank outbound/inbound payloads, and transaction traceability without PII.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchLogs}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedLog(null);
                                }}
                                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Real Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Records</div>
                        <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-medium text-green-600 uppercase tracking-wider">Success Calls</div>
                        <div className="mt-1 text-2xl font-bold text-green-700">{stats.success}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-medium text-red-600 uppercase tracking-wider">Rejections / Failures</div>
                        <div className="mt-1 text-2xl font-bold text-red-700">{stats.failed}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response Time</div>
                        <div className="mt-1 text-2xl font-bold text-indigo-600">{stats.avgLatency ? `${stats.avgLatency} ms` : '—'}</div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Request ID, Message ID, URL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="SUCCESS">SUCCESS (200)</option>
                            <option value="FAILED">FAILED</option>
                            <option value="UNKNOWN">UNKNOWN</option>
                        </select>
                    </div>
                </div>

                {/* Main Data Table */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-600">Loading audit log records from server...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center bg-red-50">
                            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                            <h3 className="text-sm font-semibold text-red-800">Error loading logs</h3>
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                            <button
                                onClick={fetchLogs}
                                className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        /* Exact user requirement: No dummy data, show 'No records yet' */
                        <div className="py-16 px-4 text-center">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                                <Database className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900">No records yet</h3>
                            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                No activity or audit records found in the database matching the current filter.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-left">
                                <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Timestamp</th>
                                        <th scope="col" className="px-4 py-3">Traceability IDs</th>
                                        <th scope="col" className="px-4 py-3">API Operation</th>
                                        <th scope="col" className="px-4 py-3">Outbound Request (No PII)</th>
                                        <th scope="col" className="px-4 py-3">HTTP & Latency</th>
                                        <th scope="col" className="px-4 py-3">Bank Inbound Response</th>
                                        <th scope="col" className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {filteredLogs.map((log) => {
                                        const isSuccess = log.applicationStatus === 'SUCCESS';
                                        const isFailed = log.applicationStatus === 'FAILED';
                                        const formattedTime = log.requestTimestamp
                                            ? new Date(log.requestTimestamp).toLocaleString()
                                            : log.createdAt
                                            ? new Date(log.createdAt).toLocaleString()
                                            : '—';

                                        const requestPreview = formatJsonPreview(log.requestPayloadSanitized);
                                        const responsePreview = formatJsonPreview(log.responseBodySanitized);

                                        return (
                                            <tr
                                                key={log._id}
                                                onClick={() => setSelectedLog(log)}
                                                className={`hover:bg-indigo-50/40 cursor-pointer transition ${
                                                    selectedLog?._id === log._id ? 'bg-indigo-50/60' : ''
                                                }`}
                                            >
                                                {/* Timestamp */}
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                    <div className="font-medium text-gray-900">{formattedTime}</div>
                                                    {log.environment && (
                                                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase">
                                                            {log.environment}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Traceability IDs */}
                                                <td className="px-4 py-3 text-xs text-gray-700">
                                                    {log.requestId ? (
                                                        <div className="flex items-center gap-1 font-mono text-[11px] text-gray-800">
                                                            <span>Req: {log.requestId.slice(0, 16)}...</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(log.requestId, `req-${log._id}`);
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600"
                                                                title="Copy Request ID"
                                                            >
                                                                {copiedId === `req-${log._id}` ? (
                                                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                                                ) : (
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    {log.messageId ? (
                                                        <div className="font-mono text-[11px] text-indigo-600 mt-0.5">
                                                            Msg: {log.messageId}
                                                        </div>
                                                    ) : null}
                                                    {!log.requestId && !log.messageId && (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* API Endpoint & Method */}
                                                <td className="px-4 py-3 text-xs">
                                                    <div className="font-semibold text-gray-900">{log.apiName || log.action}</div>
                                                    <div className="font-mono text-[11px] text-gray-500 truncate max-w-xs" title={log.endpoint}>
                                                        <span className="font-bold text-gray-700 mr-1">{log.method || 'POST'}</span>
                                                        {log.endpoint ? log.endpoint.replace(/https?:\/\/[^/]+/i, '') : ''}
                                                    </div>
                                                </td>

                                                {/* Request Payload (Masked / Sanitized) */}
                                                <td className="px-4 py-3 text-xs">
                                                    <div className="bg-gray-900 text-gray-200 rounded-md p-2 font-mono text-[11px] max-w-xs max-h-16 overflow-hidden relative shadow-inner">
                                                        <pre className="whitespace-pre-wrap">{requestPreview}</pre>
                                                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-900 to-transparent" />
                                                    </div>
                                                </td>

                                                {/* HTTP & Latency */}
                                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                                                                log.httpStatus === 200
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : log.httpStatus === 403
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}
                                                        >
                                                            {log.httpStatus || 'N/A'}
                                                        </span>
                                                        <span className="text-gray-500 font-mono text-[11px]">
                                                            {log.durationMs ? `${log.durationMs}ms` : '—'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1">
                                                        <span
                                                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                                isSuccess
                                                                    ? 'bg-green-50 text-green-700'
                                                                    : isFailed
                                                                    ? 'bg-red-50 text-red-700'
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                        >
                                                            {log.applicationStatus || 'UNKNOWN'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Bank Inbound Response */}
                                                <td className="px-4 py-3 text-xs">
                                                    <div className="bg-gray-50 border border-gray-200 text-gray-800 rounded-md p-2 font-mono text-[11px] max-w-xs max-h-16 overflow-hidden relative">
                                                        <pre className="whitespace-pre-wrap">{responsePreview}</pre>
                                                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 to-transparent" />
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedLog(log)}
                                                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-medium"
                                                    >
                                                        View Details
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Detail Inspection Drawer / Modal (For Bank Screenshot & Audit) */}
                {selectedLog && (
                    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
                        <div className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200">
                            {/* Drawer Header */}
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-gray-900">{selectedLog.apiName || selectedLog.action}</h2>
                                        <span
                                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                selectedLog.applicationStatus === 'SUCCESS'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {selectedLog.applicationStatus || 'UNKNOWN'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedLog.endpoint}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                                {/* Meta Badges */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div>
                                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">HTTP Status</span>
                                        <span className="text-sm font-bold text-gray-900">{selectedLog.httpStatus || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">Response Time</span>
                                        <span className="text-sm font-bold text-indigo-600">{selectedLog.durationMs ? `${selectedLog.durationMs} ms` : '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">Environment</span>
                                        <span className="text-sm font-bold text-gray-800 uppercase">{selectedLog.environment || 'uat'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">Timestamp</span>
                                        <span className="text-[11px] font-medium text-gray-800">
                                            {selectedLog.requestTimestamp ? new Date(selectedLog.requestTimestamp).toLocaleTimeString() : '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Traceability IDs */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                        Point 29 Traceability Attributes
                                    </h3>
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2 font-mono text-[11px]">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Request ID:</span>
                                            <span className="font-bold text-gray-900">{selectedLog.requestId || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Message ID:</span>
                                            <span className="font-bold text-indigo-700">{selectedLog.messageId || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Transaction ID:</span>
                                            <span className="text-gray-800">{selectedLog.transactionId || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Provider Reference:</span>
                                            <span className="text-gray-800">{selectedLog.providerReference || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Outbound Request Section (Sanitized) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                                            <ArrowUpRight className="h-4 w-4 text-blue-600" />
                                            Outbound Request (Zero PII - Sanitized)
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(formatJsonPreview(selectedLog.requestPayloadSanitized), 'drawer-req')}
                                            className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px] flex items-center gap-1"
                                        >
                                            <Copy className="h-3 w-3" />
                                            Copy JSON
                                        </button>
                                    </div>
                                    <div className="bg-gray-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] overflow-x-auto shadow-inner">
                                        <pre className="whitespace-pre-wrap">
                                            {formatJsonPreview(selectedLog.requestPayloadSanitized)}
                                        </pre>
                                    </div>
                                </div>

                                {/* Inbound Bank Response Section */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                                            Inbound Bank Response (Received from Kotak)
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(formatJsonPreview(selectedLog.responseBodySanitized), 'drawer-res')}
                                            className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px] flex items-center gap-1"
                                        >
                                            <Copy className="h-3 w-3" />
                                            Copy JSON
                                        </button>
                                    </div>
                                    <div className="bg-gray-900 text-blue-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto shadow-inner">
                                        <pre className="whitespace-pre-wrap">
                                            {formatJsonPreview(selectedLog.responseBodySanitized)}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedLog(null)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 text-xs transition"
                                >
                                    Close Drawer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ActivityLogs;
