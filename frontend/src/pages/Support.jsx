import React, { useState, useEffect } from 'react';
import { TicketIcon, Upload, AlertCircle, History, Eye, X, Send, Clock, CheckCircle, RefreshCw, MessageSquare, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';

/* ============================================================
 * Shared helpers
 * ==========================================================*/
const FieldError = ({ msg }) => msg ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{msg}</p> : null;

/* ============================================================
 * Raise Ticket Section (from support/RaiseTicket.jsx)
 * ==========================================================*/
const CATEGORIES = ['Payment Issue', 'Payout Issue', 'API Issue', 'KYC Issue', 'Other'];

const RaiseTicketSection = ({ onNavigate }) => {
    const [form, setForm] = useState({ subject: '', category: '', description: '' });
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) { toast.error('Attachment exceeds maximum size (5MB)'); return; }
        setFile(f);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('subject', form.subject);
            fd.append('category', form.category);
            fd.append('description', form.description);
            if (file) fd.append('attachment', file);

            await apiClient.post('/support/create-ticket', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Ticket created successfully!');
            setForm({ subject: '', category: '', description: '' });
            setFile(null);
            if (onNavigate) onNavigate('Ticket History');
        } catch (err) {
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
            else toast.error(err.response?.data?.msg || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full pb-12 max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2"><TicketIcon className="w-7 h-7 text-violet-600" /> Raise Support Ticket</h1>
                <p className="text-sm text-gray-500 mt-1">We typically respond within 2–4 business hours.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-sm font-black text-gray-900">New Support Ticket</p>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject <span className="text-red-400">*</span></label>
                        <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${errors.subject ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-violet-500'}`}
                            placeholder="Brief summary of your issue" />
                        <FieldError msg={errors.subject} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category <span className="text-red-400">*</span></label>
                        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${errors.category ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-violet-500'}`}>
                            <option value="">Select a category...</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <FieldError msg={errors.category} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description <span className="text-red-400">*</span></label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={5}
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition resize-none ${errors.description ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-violet-500'}`}
                            placeholder="Describe the issue in detail — include any error messages, transaction IDs, or timestamps..." />
                        <FieldError msg={errors.description} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Attachment <span className="text-gray-400">(optional)</span></label>
                        <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition bg-gray-50">
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">{file ? <span className="text-violet-600 font-semibold">{file.name}</span> : 'Click to attach a file (PDF, JPG, PNG — max 5MB)'}</span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
                        </label>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">Ticket ID will be auto-assigned (e.g. BP-TKT-0001)</p>
                    <button type="submit" disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-60 shadow-sm">
                        {loading ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" /> : <TicketIcon className="w-4 h-4" />}
                        {loading ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                </div>
            </form>
        </div>
    );
};

/* ============================================================
 * Ticket History Section (from support/TicketHistory.jsx)
 * ==========================================================*/
const STATUS_MAP = {
    open: { label: 'Open', cls: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' },
    resolved: { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-700' },
    closed: { label: 'Closed', cls: 'bg-gray-200 text-gray-600' },
};

const StatusBadge = ({ status }) => {
    const s = STATUS_MAP[status] || STATUS_MAP.open;
    return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${s.cls}`}>{s.label}</span>;
};

const TicketHistorySection = ({ onNavigate }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drawer, setDrawer] = useState(null);
    const [reply, setReply] = useState('');
    const [replying, setReplying] = useState(false);
    const [page, setPage] = useState(1);
    const PER = 8;

    const load = () => {
        setLoading(true);
        apiClient.get('/support/my-tickets')
            .then(r => { setTickets(r.data); setLoading(false); })
            .catch(() => { toast.error('Failed to load tickets'); setLoading(false); });
    };

    useEffect(() => { load(); }, []);

    const openDrawer = (t) => { setDrawer(t); setReply(''); };

    const handleReply = async () => {
        if (!reply.trim()) return;
        setReplying(true);
        try {
            const r = await apiClient.post(`/support/reply/${drawer._id}`, { message: reply });
            setDrawer(r.data.ticket);
            setTickets(p => p.map(t => t._id === r.data.ticket._id ? r.data.ticket : t));
            setReply('');
            toast.success('Reply sent');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to send reply');
        } finally {
            setReplying(false);
        }
    };

    const paged = tickets.slice((page - 1) * PER, page * PER);
    const pages = Math.ceil(tickets.length / PER);

    return (
        <div className="w-full pb-12 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2"><History className="w-7 h-7 text-slate-600" /> Ticket History</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage your support requests.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition"><RefreshCw className="w-4 h-4" /></button>
                    {onNavigate && <button onClick={() => onNavigate('Raise Ticket')} className="px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-sm">+ New Ticket</button>}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}</div>
            ) : tickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No tickets yet</p>
                    <p className="text-gray-400 text-sm mt-1">Raise a ticket and we'll be happy to help you.</p>
                    {onNavigate && <button onClick={() => onNavigate('Raise Ticket')} className="mt-5 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition">Raise a Ticket</button>}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-50 text-sm">
                            <thead className="bg-gray-50/80">
                                <tr>{['Ticket ID', 'Subject', 'Category', 'Status', 'Created', 'Updated', 'Action'].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paged.map(t => (
                                    <tr key={t._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4"><code className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded">{t.ticketId}</code></td>
                                        <td className="px-5 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">{t.subject}</td>
                                        <td className="px-5 py-4 text-xs text-gray-500">{t.category}</td>
                                        <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                                        <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                        <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">{new Date(t.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                        <td className="px-5 py-4">
                                            <button onClick={() => openDrawer(t)} className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">
                                                <Eye className="w-3.5 h-3.5" /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pages > 1 && (
                        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-xs text-gray-400">{tickets.length} total tickets</p>
                            <div className="flex gap-1">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                                <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Drawer */}
            {drawer && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={() => setDrawer(null)}>
                    <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <code className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">{drawer.ticketId}</code>
                                    <StatusBadge status={drawer.status} />
                                </div>
                                <p className="text-sm font-bold text-gray-900">{drawer.subject}</p>
                                <p className="text-xs text-gray-400">{drawer.category}</p>
                            </div>
                            <button onClick={() => setDrawer(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Original Description</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{drawer.description}</p>
                            </div>

                            {drawer.replies?.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversation</p>
                                    {drawer.replies.map((r, i) => (
                                        <div key={i} className={`flex ${r.senderRole === 'admin' ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${r.senderRole === 'admin' ? 'bg-blue-50 text-blue-900 rounded-tl-sm' : 'bg-slate-900 text-white rounded-tr-sm'}`}>
                                                <p className={`text-xs font-bold mb-1 ${r.senderRole === 'admin' ? 'text-blue-600' : 'text-slate-300'}`}>
                                                    {r.senderRole === 'admin' ? '🛡 Support Team' : 'You'}
                                                </p>
                                                {r.message}
                                                <p className={`text-xs mt-1 ${r.senderRole === 'admin' ? 'text-blue-400' : 'text-slate-400'}`}>
                                                    {new Date(r.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reply Box */}
                        {drawer.status !== 'closed' && (
                            <div className="border-t border-gray-100 p-4 bg-white">
                                <div className="flex gap-2">
                                    <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Add a reply..." />
                                    <button onClick={handleReply} disabled={replying || !reply.trim()}
                                        className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-1">
                                        {replying ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ============================================================
 * Contact Us Section (from support/ContactUs.jsx)
 * ==========================================================*/
const ContactUsSection = () => {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);
        try {
            await apiClient.post('/support/contact', form);
            setSent(true);
            toast.success('Message sent! We\'ll get back to you shortly.');
        } catch (err) {
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
            else toast.error(err.response?.data?.msg || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full pb-12 space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2"><MessageCircle className="w-7 h-7 text-blue-600" /> Contact Us</h1>
                <p className="text-sm text-gray-500 mt-1">Our support team is available Monday–Friday, 9 AM to 6 PM IST.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-4">
                    {[
                        { icon: Mail, label: 'Support Email', val: 'support@bluepay.co.in', sub: 'Response within 4 business hours', color: 'blue' },
                        { icon: Phone, label: 'Support Phone', val: '+91 98765 43210', sub: 'Mon–Fri, 9 AM – 6 PM IST', color: 'emerald' },
                        { icon: MapPin, label: 'Business Address', val: 'BluePay Technologies Pvt. Ltd.', sub: '400 B, Whitefield, Bengaluru, Karnataka – 560066', color: 'violet' },
                    ].map(c => (
                        <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-all">
                            <div className={`p-3 rounded-xl bg-${c.color}-50 shrink-0`}><c.icon className={`w-5 h-5 text-${c.color}-600`} /></div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{c.label}</p>
                                <p className="text-sm font-black text-gray-900">{c.val}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                            </div>
                        </div>
                    ))}

                    {/* SLA Info */}
                    <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-5 text-white">
                        <p className="font-black text-sm mb-3">Support SLA</p>
                        {[['Critical (P1)', '1 hour'], ['High (P2)', '4 hours'], ['Medium (P3)', '1 business day'], ['Low (P4)', '3 business days']].map(([p, t]) => (
                            <div key={p} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                                <span className="text-xs text-slate-300">{p}</span>
                                <span className="text-xs font-bold text-blue-300">{t}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <p className="text-sm font-black text-gray-900">Send us a Message</p>
                        <p className="text-xs text-gray-400 mt-0.5">For quick help, use Raise Ticket for issue tracking.</p>
                    </div>
                    {sent ? (
                        <div className="p-12 text-center">
                            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                            <p className="text-lg font-black text-gray-900">Message Sent!</p>
                            <p className="text-sm text-gray-400 mt-1">Thank you for reaching out. We'll respond within 4 business hours.</p>
                            <button onClick={() => { setSent(false); setForm({ name: '', email: '', message: '' }); }}
                                className="mt-5 px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition">
                                Send Another Message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name <span className="text-red-400">*</span></label>
                                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${errors.name ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                    placeholder="Your full name" />
                                <FieldError msg={errors.name} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address <span className="text-red-400">*</span></label>
                                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email"
                                    className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${errors.email ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                    placeholder="you@example.com" />
                                <FieldError msg={errors.email} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message <span className="text-red-400">*</span></label>
                                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={5}
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition resize-none ${errors.message ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                    placeholder="How can we help you?" />
                                <FieldError msg={errors.message} />
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-60 shadow-sm">
                                {loading ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" /> : <Send className="w-4 h-4" />}
                                {loading ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ============================================================
 * Support (consolidated module page)
 * ==========================================================*/
const TABS = ['Raise Ticket', 'Ticket History', 'Contact Us'];

const Support = ({ view, onNavigate }) => {
    const [activeView, setActiveView] = useState(TABS.includes(view) ? view : 'Raise Ticket');

    useEffect(() => {
        if (view && TABS.includes(view)) setActiveView(view);
    }, [view]);

    const handleNavigate = (nextView) => {
        setActiveView(nextView);
        if (onNavigate) onNavigate(nextView);
    };

    return (
        <div className="w-full">
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-1 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleNavigate(tab)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-xl whitespace-nowrap transition ${
                            activeView === tab
                                ? 'bg-white text-slate-900 border border-b-0 border-gray-100 shadow-sm'
                                : 'text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Active Section */}
            {activeView === 'Ticket History' ? (
                <TicketHistorySection onNavigate={handleNavigate} />
            ) : activeView === 'Contact Us' ? (
                <ContactUsSection />
            ) : (
                <RaiseTicketSection onNavigate={handleNavigate} />
            )}
        </div>
    );
};

export default Support;
