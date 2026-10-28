import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import {
    CheckCircle, XCircle, Clock, RefreshCw, Search,
    MessageSquare, ExternalLink, ArrowDownLeft, AlertTriangle,
    ChevronLeft, ChevronRight, X,
} from 'lucide-react';

const STATUS_STYLES = {
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICONS = {
    approved: <CheckCircle className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
};

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {STATUS_ICONS[status]} {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
);

const viewReceipt = async (request, setReceiptLoading) => {
    setReceiptLoading(true);
    try {
        const response = await apiClient.get(`/funds/${request._id}/receipt`, { responseType: 'blob' });
        const url = URL.createObjectURL(response.data);
        window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
        toast.error(error.response?.data?.msg || 'Unable to open receipt');
    } finally {
        setReceiptLoading(false);
    }
};

const RequestModal = ({ request, onClose, onDone }) => {
    const isPending = request.status === 'pending';
    const [action, setAction] = useState('approved');
    const [remark, setRemark] = useState('');
    const [loading, setLoading] = useState(false);
    const [receiptLoading, setReceiptLoading] = useState(false);

    const handleSubmit = async () => {
        if (action === 'rejected' && !remark.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        setLoading(true);
        try {
            await apiClient.put(`/funds/${request._id}/status`, {
                status: action,
                adminRemarks: remark.trim() || (action === 'approved' ? 'Approved by admin' : ''),
            });
            toast.success(`Request ${action} successfully!`);
            onDone();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-1.5">
                    <h2 className="text-xl font-bold text-gray-900">{isPending ? 'Review Fund Request' : 'Fund Request Details'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    From <strong>{request.userId?.first_name} {request.userId?.last_name}</strong> ({request.userId?.email}) — ₹{request.amount?.toLocaleString('en-IN')}
                </p>

                {/* Request details */}
                <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm border border-gray-100">
                    <div className="flex justify-between">
                        <span className="text-gray-500">UTR / Ref No.</span>
                        <span className="font-mono font-semibold text-gray-800">{request.utr_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Amount</span>
                        <span className="font-bold text-lg text-gray-900">₹{request.amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Submitted</span>
                        <span className="text-gray-700">{new Date(request.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {request.remarks && (
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500 shrink-0">Merchant note</span>
                            <span className="text-gray-700 text-right">{request.remarks}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Status</span>
                        <StatusBadge status={request.status} />
                    </div>
                    {request.receipt_image && (
                        <div className="pt-2">
                            <button
                                type="button"
                                disabled={receiptLoading}
                                onClick={() => viewReceipt(request, setReceiptLoading)}
                                className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline disabled:opacity-50"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> {receiptLoading ? 'Opening...' : 'View Payment Receipt'}
                            </button>
                        </div>
                    )}
                </div>

                {!isPending && (
                    <div className={`rounded-xl p-4 mb-5 text-sm border ${request.status === 'rejected' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <div className={`text-xs uppercase font-semibold mb-1 ${request.status === 'rejected' ? 'text-red-500' : 'text-emerald-600'}`}>Admin Remarks</div>
                        <div className={request.status === 'rejected' ? 'text-red-700' : 'text-emerald-700'}>{request.adminRemarks || 'No remarks recorded.'}</div>
                    </div>
                )}

                {isPending && (
                    <>
                        {/* Action selector */}
                        <div className="mb-4">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Action</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['approved', 'rejected'].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setAction(opt)}
                                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${action === opt
                                            ? (opt === 'approved' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700')
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                        }`}
                                    >
                                        {opt === 'approved' ? '✓ Approve & Credit' : '✗ Reject'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Remark input */}
                        <div className="mb-5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Admin Remark {action === 'rejected' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                rows={3}
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder={action === 'approved' ? 'Optional note to user (e.g. "Deposit verified and credited")' : 'Required — reason for rejection'}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition ${action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}
                            >
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                {action === 'approved' ? 'Approve & Credit' : 'Reject Request'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const PAGE_SIZE = 20;

const FundRequests = () => {
    const [requests, setRequests] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [status, setStatus] = useState('all');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [utr, setUtr] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);

    const debounceRef = useRef(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchInput]);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/funds', {
                params: {
                    status: status === 'all' ? undefined : status,
                    search: search || undefined,
                    utr: utr || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    page,
                    limit: PAGE_SIZE,
                },
            });
            setRequests(res.data.requests || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            if (err?.isCanceled || err?.message === 'canceled') return;
            setError(err.response?.data?.msg || 'Failed to load fund requests');
        } finally {
            setLoading(false);
        }
    }, [status, search, utr, dateFrom, dateTo, page]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    // Keep an open modal's data fresh after a refresh/action instead of
    // showing whatever was in it before the list reloaded.
    useEffect(() => {
        if (!selectedRequest) return;
        const updated = requests.find((r) => r._id === selectedRequest._id);
        if (updated) setSelectedRequest(updated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requests, selectedRequest?._id]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasActiveFilters = search || utr || dateFrom || dateTo || status !== 'all';

    return (
        <Layout>
            <div className="mt-8 mb-8 flex items-center gap-3">
                <h1 className="text-[3rem] font-medium text-gray-900 tracking-tight leading-none">Fund Requests</h1>
            </div>

            {/* Action toolbar */}
            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-5 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by merchant name, email..."
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <input
                        type="text"
                        value={utr}
                        onChange={(e) => { setUtr(e.target.value); setPage(1); }}
                        placeholder="Search UTR..."
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {['all', 'pending', 'approved', 'rejected'].map((f) => (
                            <button
                                key={f}
                                onClick={() => { setStatus(f); setPage(1); }}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${status === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600" title="Submitted from" />
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600" title="Submitted to" />
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearchInput(''); setSearch(''); setUtr(''); setDateFrom(''); setDateTo(''); setStatus('all'); setPage(1); }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                            Clear filters
                        </button>
                    )}
                    <button onClick={fetchRequests} className="ml-auto px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition flex items-center gap-2 text-sm font-medium">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                        <span className="text-sm">{error}</span>
                        <button onClick={fetchRequests} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                    </div>
                ) : requests.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead>
                                    <tr className="bg-gray-50/70">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Merchant</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">UTR / Ref No.</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Remark</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {requests.map((req) => (
                                        <tr key={req._id} className="hover:bg-blue-50/20 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${req.userId?.first_name}+${req.userId?.last_name}&background=random&size=40`}
                                                        className="w-9 h-9 rounded-full border border-gray-100"
                                                        alt=""
                                                    />
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{req.userId?.first_name} {req.userId?.last_name}</p>
                                                        <p className="text-xs text-gray-400">{req.userId?.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-lg font-bold text-gray-900">₹{req.amount?.toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">{req.utr_number}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {req.receipt_image ? (
                                                    <ReceiptLink request={req} />
                                                ) : <span className="text-gray-300 text-xs italic">No receipt</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                {req.adminRemarks || <span className="text-gray-300 italic text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm ${req.status === 'pending' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    {req.status === 'pending' ? 'Review' : 'View Details'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
                            <span>Page {page} of {totalPages} · {total} request{total === 1 ? '' : 's'}</span>
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
                ) : (
                    <div className="text-center py-20 text-gray-400">
                        <ArrowDownLeft className="w-14 h-14 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No fund requests found</p>
                        {hasActiveFilters && <p className="text-sm mt-1">Try changing your filter or search query</p>}
                    </div>
                )}
            </div>

            {/* Details / Action Modal */}
            {selectedRequest && (
                <RequestModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onDone={() => { setSelectedRequest(null); fetchRequests(); }}
                />
            )}
        </Layout>
    );
};

const ReceiptLink = ({ request }) => {
    const [loading, setLoading] = useState(false);
    return (
        <button
            type="button"
            disabled={loading}
            onClick={() => viewReceipt(request, setLoading)}
            className="flex items-center gap-1 text-blue-600 text-xs font-semibold hover:underline disabled:opacity-50"
        >
            <ExternalLink className="w-3.5 h-3.5" /> {loading ? 'Opening...' : 'View Receipt'}
        </button>
    );
};

export default FundRequests;
