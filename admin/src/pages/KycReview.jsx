import React, { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import {
    Search, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Inbox,
    CheckCircle, XCircle, Clock, FileText, X, ShieldCheck,
} from 'lucide-react';

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    not_submitted: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_ICONS = {
    pending: <Clock className="w-3.5 h-3.5" />,
    approved: <CheckCircle className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
};

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[status] || STATUS_STYLES.not_submitted}`}>
        {STATUS_ICONS[status]} {status?.replace('_', ' ') || 'unknown'}
    </span>
);

const PAGE_SIZE = 20;

const KycReview = () => {
    const [records, setRecords] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [accountType, setAccountType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const debounceRef = useRef(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchInput]);

    // Details modal state
    const [activeRecord, setActiveRecord] = useState(null);
    const [reason, setReason] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);
    const [docLoading, setDocLoading] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/admin/kyc', {
                params: { search, status, accountType, dateFrom, dateTo, page, limit: PAGE_SIZE },
            });
            setRecords(response.data.kyc || []);
            setTotal(response.data.total || 0);
        } catch (err) {
            if (err?.isCanceled) return;
            setError(err.response?.data?.msg || 'Unable to load KYC records');
        } finally {
            setLoading(false);
        }
    }, [search, status, accountType, dateFrom, dateTo, page]);

    useEffect(() => { load(); }, [load]);

    // Keep the open details modal in sync with the freshly-loaded list
    // (e.g. after an approve/reject) instead of showing stale data.
    // Deliberately keyed on the id, not the whole object: including
    // `activeRecord` would re-fire every time this effect calls
    // setActiveRecord with a new object reference.
    useEffect(() => {
        if (!activeRecord) return;
        const updated = records.find((r) => r._id === activeRecord._id);
        if (updated) setActiveRecord(updated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records, activeRecord?._id]);

    const openDetails = (record) => {
        setActiveRecord(record);
        setReason('');
    };

    const review = async (record, newStatus) => {
        if (newStatus === 'rejected' && !reason.trim()) {
            toast.error('A rejection reason is required');
            return;
        }
        setReviewLoading(true);
        try {
            await apiClient.put(`/admin/kyc/${record._id}/review`, { status: newStatus, rejection_reason: reason });
            toast.success(`KYC ${newStatus}`);
            setReason('');
            load();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to review KYC');
        } finally {
            setReviewLoading(false);
        }
    };

    const openDocument = async (record, field) => {
        setDocLoading(field);
        try {
            const response = await apiClient.get(`/admin/kyc/${record._id}/document/${field}`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to open document');
        } finally {
            setDocLoading(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasActiveFilters = search || status || accountType || dateFrom || dateTo;

    return (
        <Layout>
            <div className="flex items-center justify-between gap-3 mt-8 mb-8">
                <div>
                    <h1 className="text-[3rem] font-medium text-gray-900 tracking-tight leading-none">KYC</h1>
                    <p className="mt-2 text-sm text-gray-500">Review merchant identity/business verification submissions.</p>
                </div>
                <button onClick={load} className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 flex items-center justify-center bg-white shadow-sm" title="Refresh">
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search name, email, mobile, company..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-indigo-500 w-72"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>

                    <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">All KYC statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <select value={accountType} onChange={(e) => { setAccountType(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">All account types</option>
                        <option value="corporate">Corporate</option>
                        <option value="individual">Individual</option>
                    </select>

                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm text-gray-600" title="Submitted from" />
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm text-gray-600" title="Submitted to" />

                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearchInput(''); setSearch(''); setStatus(''); setAccountType(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : error ? (
                <div className="bg-white rounded-lg shadow p-10 flex flex-col items-center gap-2 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-sm">{error}</span>
                    <button onClick={load} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {records.map((record) => (
                                    <tr key={record._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{record.merchant?.company_name || `${record.merchant?.first_name || ''} ${record.merchant?.last_name || ''}`}</div>
                                            <div className="text-sm text-gray-500">{record.merchant?.first_name} {record.merchant?.last_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.merchant?.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{record.merchant?.accountType || '—'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={record.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '—'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => openDetails(record)}
                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition text-xs font-bold"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {records.length === 0 && (
                        <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                            <Inbox className="w-6 h-6 text-gray-300" />
                            {hasActiveFilters ? 'No KYC records match the current search/filters.' : 'No KYC submissions yet.'}
                        </div>
                    )}
                    {records.length > 0 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
                            <span>Page {page} of {totalPages} · {total} record{total === 1 ? '' : 's'}</span>
                            <div className="flex items-center gap-2">
                                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Details Modal */}
            {activeRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                <h2 className="text-xl font-bold text-gray-900">KYC Details</h2>
                            </div>
                            <button onClick={() => setActiveRecord(null)}><X size={22} className="text-gray-400 hover:text-gray-700" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {activeRecord.merchant?.company_name || `${activeRecord.merchant?.first_name || ''} ${activeRecord.merchant?.last_name || ''}`}
                                    </h3>
                                    <p className="text-sm text-gray-500">{activeRecord.merchant?.first_name} {activeRecord.merchant?.last_name}</p>
                                </div>
                                <StatusBadge status={activeRecord.status} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <div className="text-xs text-gray-400 uppercase">Email</div>
                                    <div className="font-medium text-gray-800">{activeRecord.merchant?.email || '—'}</div>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <div className="text-xs text-gray-400 uppercase">Mobile</div>
                                    <div className="font-medium text-gray-800">{activeRecord.merchant?.mobile_number || '—'}</div>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <div className="text-xs text-gray-400 uppercase">Account Type</div>
                                    <div className="font-medium text-gray-800 capitalize">{activeRecord.merchant?.accountType || '—'}</div>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <div className="text-xs text-gray-400 uppercase">KYC Type</div>
                                    <div className="font-medium text-gray-800 capitalize">{activeRecord.kycType || '—'}</div>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <div className="text-xs text-gray-400 uppercase">Submitted</div>
                                    <div className="font-medium text-gray-800">{activeRecord.createdAt ? new Date(activeRecord.createdAt).toLocaleString() : '—'}</div>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <div className="text-xs text-gray-400 uppercase">Last Updated</div>
                                    <div className="font-medium text-gray-800">{activeRecord.updatedAt ? new Date(activeRecord.updatedAt).toLocaleString() : '—'}</div>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded-xl p-4 text-sm space-y-2">
                                <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Masked identity numbers</div>
                                {activeRecord.panMasked && <div className="flex justify-between"><span className="text-gray-500">PAN</span><span className="font-mono text-gray-800">{activeRecord.panMasked}</span></div>}
                                {activeRecord.aadhaarMasked && <div className="flex justify-between"><span className="text-gray-500">Aadhaar</span><span className="font-mono text-gray-800">{activeRecord.aadhaarMasked}</span></div>}
                                {activeRecord.gstMasked && <div className="flex justify-between"><span className="text-gray-500">GST</span><span className="font-mono text-gray-800">{activeRecord.gstMasked}</span></div>}
                                {!activeRecord.panMasked && !activeRecord.aadhaarMasked && !activeRecord.gstMasked && (
                                    <div className="text-gray-400 text-xs">No identity numbers on file.</div>
                                )}
                            </div>

                            <div>
                                <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Submitted Documents</div>
                                {activeRecord.documentsPresent?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {activeRecord.documentsPresent.map((field) => (
                                            <button
                                                type="button"
                                                key={field}
                                                disabled={docLoading === field}
                                                onClick={() => openDocument(activeRecord, field)}
                                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                            >
                                                <FileText className="w-3.5 h-3.5" /> {docLoading === field ? 'Opening...' : field.replace('_file', '').replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-xs">No documents uploaded.</div>
                                )}
                            </div>

                            {activeRecord.status === 'rejected' && (
                                <div className="border border-red-100 bg-red-50 rounded-xl p-4 text-sm">
                                    <div className="text-xs text-red-500 uppercase font-semibold mb-1">Rejection Reason</div>
                                    <div className="text-red-700">{activeRecord.rejection_reason || 'No reason recorded.'}</div>
                                </div>
                            )}

                            {activeRecord.status === 'approved' && (
                                <div className="border border-emerald-100 bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> This KYC has been approved. No further action is needed.
                                </div>
                            )}

                            {activeRecord.status === 'pending' && (
                                <div className="border-t border-gray-100 pt-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin remarks (required if rejecting)</label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Reason for rejection..."
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm"
                                        rows="3"
                                    />
                                    <div className="mt-4 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            disabled={reviewLoading}
                                            onClick={() => review(activeRecord, 'rejected')}
                                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {reviewLoading ? 'Please wait...' : 'Reject'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={reviewLoading}
                                            onClick={() => review(activeRecord, 'approved')}
                                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            {reviewLoading ? 'Please wait...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default KycReview;
