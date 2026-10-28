import React, { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import {
    Search, RefreshCw, AlertTriangle, Inbox, X, Paperclip, Send,
    ChevronLeft, ChevronRight,
} from 'lucide-react';

const STATUS_STYLES = {
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

const PRIORITY_STYLES = {
    low: 'bg-gray-100 text-gray-600 border-gray-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200',
};

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high'];

const StatusBadge = ({ status }) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {status?.replace('_', ' ')}
    </span>
);

const PriorityBadge = ({ priority }) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${PRIORITY_STYLES[priority] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {priority}
    </span>
);

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------
// Ticket details / conversation modal
// ---------------------------------------------------------------------
const TicketModal = ({ ticketId, onClose, onChanged }) => {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [savingMeta, setSavingMeta] = useState(false);
    const [attachmentLoading, setAttachmentLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get(`/admin/support/${ticketId}`);
            setTicket(res.data.ticket);
            setStatus(res.data.ticket.status);
            setPriority(res.data.ticket.priority);
        } catch (err) {
            setError(err.response?.data?.msg || 'Unable to load ticket');
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => { load(); }, [load]);

    const sendReply = async () => {
        if (!reply.trim()) { toast.error('Message is required'); return; }
        setSending(true);
        try {
            await apiClient.post(`/admin/support/${ticketId}/reply`, { message: reply.trim() });
            toast.success('Reply sent');
            setReply('');
            load();
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const saveMeta = async () => {
        setSavingMeta(true);
        try {
            await apiClient.put(`/admin/support/${ticketId}`, { status, priority });
            toast.success('Ticket updated');
            load();
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to update ticket');
        } finally {
            setSavingMeta(false);
        }
    };

    const viewAttachment = async () => {
        setAttachmentLoading(true);
        try {
            const res = await apiClient.get(`/admin/support/${ticketId}/attachment`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to open attachment');
        } finally {
            setAttachmentLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                    <h2 className="text-xl font-bold text-gray-900">Ticket Details</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin" /></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                        <span className="text-sm">{error}</span>
                        <button onClick={load} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs text-gray-400 font-mono mb-1">{ticket.ticketId}</div>
                                <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {ticket.userId?.company_name || `${ticket.userId?.first_name || ''} ${ticket.userId?.last_name || ''}`} · {ticket.userId?.email}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                <StatusBadge status={ticket.status} />
                                <PriorityBadge priority={ticket.priority} />
                            </div>
                        </div>

                        <div className="border border-gray-100 rounded-xl p-4 text-sm space-y-2">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Category: <span className="text-gray-600">{ticket.category}</span></span>
                                <span>Submitted: {new Date(ticket.createdAt).toLocaleString('en-IN')}</span>
                            </div>
                            <p className="text-gray-700">{ticket.description}</p>
                            {ticket.attachment && (
                                <button onClick={viewAttachment} disabled={attachmentLoading} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50">
                                    <Paperclip className="w-3.5 h-3.5" /> {attachmentLoading ? 'Opening...' : 'View Attachment'}
                                </button>
                            )}
                        </div>

                        <div>
                            <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Conversation</div>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {(ticket.replies || []).length === 0 ? (
                                    <div className="text-xs text-gray-400 italic">No replies yet.</div>
                                ) : ticket.replies.map((r, idx) => (
                                    <div key={idx} className={`rounded-xl p-3 text-sm max-w-[85%] ${r.senderRole === 'admin' ? 'bg-indigo-50 ml-auto text-indigo-900' : 'bg-gray-50 text-gray-700'}`}>
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <span className="text-xs font-semibold uppercase">{r.senderRole === 'admin' ? 'Support Team' : 'Merchant'}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleString('en-IN')}</span>
                                        </div>
                                        <p>{r.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {ticket.status !== 'closed' ? (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reply</label>
                                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Type a reply to the merchant..." className="w-full rounded-xl border border-gray-200 p-3 text-sm" />
                                <div className="mt-3 flex justify-end">
                                    <button onClick={sendReply} disabled={sending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                                        <Send className="w-3.5 h-3.5" /> {sending ? 'Sending...' : 'Send Reply'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-400 italic border-t border-gray-100 pt-4">This ticket is closed and can no longer be replied to. Reopen it below to continue the conversation.</div>
                        )}

                        <div className="border-t border-gray-100 pt-5 flex items-end gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={saveMeta}
                                disabled={savingMeta || (status === ticket.status && priority === ticket.priority)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                            >
                                {savingMeta ? 'Saving...' : 'Update'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------
const Support = () => {
    const [data, setData] = useState({ tickets: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [activeTicketId, setActiveTicketId] = useState(null);

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
            const res = await apiClient.get('/admin/support', {
                params: { search: search || undefined, status: status || undefined, priority: priority || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, limit: PAGE_SIZE },
            });
            setData(res.data);
        } catch (err) {
            if (err?.isCanceled) return;
            setError(err.response?.data?.msg || 'Unable to load support tickets');
        } finally {
            setLoading(false);
        }
    }, [search, status, priority, dateFrom, dateTo, page]);

    useEffect(() => { load(); }, [load]);

    const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));
    const hasActiveFilters = search || status || priority || dateFrom || dateTo;

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-6 gap-4">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Support</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search subject, ticket ID, merchant..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">All priorities</option>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600" title="From date" />
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600" title="To date" />
                    {hasActiveFilters && (
                        <button onClick={() => { setSearchInput(''); setSearch(''); setStatus(''); setPriority(''); setDateFrom(''); setDateTo(''); setPage(1); }} className="text-xs text-gray-500 hover:text-gray-700 underline">
                            Clear filters
                        </button>
                    )}
                    <button onClick={load} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
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
                                        <th className="text-left px-5 py-3">Ticket</th>
                                        <th className="text-left px-5 py-3">Merchant</th>
                                        <th className="text-left px-5 py-3">Category</th>
                                        <th className="text-left px-5 py-3">Status</th>
                                        <th className="text-left px-5 py-3">Priority</th>
                                        <th className="text-left px-5 py-3">Created</th>
                                        <th className="text-right px-5 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading tickets...</td></tr>
                                    ) : (data.tickets || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-14">
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <Inbox className="w-6 h-6" />
                                                    <span>{hasActiveFilters ? 'No tickets match the current search/filters.' : 'No support tickets yet.'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : data.tickets.map((t) => (
                                        <tr key={t._id} className="hover:bg-gray-50/60">
                                            <td className="px-5 py-3">
                                                <div className="font-mono text-xs text-gray-500">{t.ticketId}</div>
                                                <div className="font-medium text-gray-800">{t.subject}</div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-700">
                                                <div className="font-medium">{t.userId?.company_name || `${t.userId?.first_name || ''} ${t.userId?.last_name || ''}`}</div>
                                                <div className="text-xs text-gray-400">{t.userId?.email}</div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">{t.category}</td>
                                            <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                                            <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                                            <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('en-IN')}</td>
                                            <td className="px-5 py-3 text-right">
                                                <button onClick={() => setActiveTicketId(t._id)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition text-xs font-bold">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                            <span>Page {page} of {totalPages} · {data.total || 0} ticket{data.total === 1 ? '' : 's'}</span>
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

            {activeTicketId && (
                <TicketModal ticketId={activeTicketId} onClose={() => setActiveTicketId(null)} onChanged={load} />
            )}
        </Layout>
    );
};

export default Support;
