import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import MerchantPicker from '../components/MerchantPicker';
import SecretRevealBanner from '../components/SecretRevealBanner';
import ConfirmModal from '../components/ConfirmModal';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import {
    RefreshCw, AlertTriangle, Inbox,
    ShieldCheck, RotateCw, Trash2, ChevronLeft, ChevronRight, Send,
} from 'lucide-react';

const EVENT_DESCRIPTIONS = {
    'payout.success': 'A payout completed successfully',
    'payout.failed': 'A payout failed permanently',
    'payout.processing': 'A payout is being processed by the bank',
    'payout.unknown': "A payout's outcome could not be determined",
    'wallet.credited': "A merchant's wallet was credited",
};

const DELIVERY_STATUS_STYLES = {
    pending: 'bg-gray-100 text-gray-600 border-gray-200',
    sending: 'bg-blue-100 text-blue-700 border-blue-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    retrying: 'bg-amber-100 text-amber-700 border-amber-200',
};

const DeliveryStatusBadge = ({ status }) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${DELIVERY_STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {status}
    </span>
);

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------
// Endpoint config panel for one environment tab
// ---------------------------------------------------------------------
const EndpointPanel = ({ merchantId, environment, endpoint, validEvents, onChanged }) => {
    const [url, setUrl] = useState(endpoint?.url || '');
    const [events, setEvents] = useState(endpoint?.events || []);
    const [saving, setSaving] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // 'regenerate' | 'delete'
    const [actionLoading, setActionLoading] = useState(false);
    const [revealedSecret, setRevealedSecret] = useState(null);

    // Re-sync the draft only when the underlying endpoint identity changes
    // (created/regenerated/reloaded) - not on every parent re-render, so
    // in-progress edits aren't wiped out from under the admin.
    useEffect(() => {
        setUrl(endpoint?.url || '');
        setEvents(endpoint?.events || []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint?._id]);

    const toggleEvent = (evt) => {
        setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
    };

    const save = async () => {
        if (!url.trim()) { toast.error('Webhook URL is required'); return; }
        if (environment === 'live' && !url.trim().startsWith('https://')) { toast.error('Live webhook URLs must use HTTPS'); return; }
        if (!events.length) { toast.error('Select at least one event'); return; }
        setSaving(true);
        try {
            if (endpoint) {
                await apiClient.put(`/admin/webhooks/${merchantId}/endpoints/${endpoint._id}`, { url: url.trim(), events });
                toast.success('Webhook updated');
            } else {
                const res = await apiClient.post(`/admin/webhooks/${merchantId}/endpoints`, { url: url.trim(), events, environment });
                toast.success('Webhook created');
                setRevealedSecret(res.data.endpoint.secret);
            }
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to save webhook');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async () => {
        if (!endpoint) return;
        try {
            await apiClient.put(`/admin/webhooks/${merchantId}/endpoints/${endpoint._id}`, { isActive: !endpoint.isActive });
            toast.success(`Webhook ${!endpoint.isActive ? 'enabled' : 'disabled'}`);
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to update webhook status');
        }
    };

    const confirmRegenerate = async () => {
        setActionLoading(true);
        try {
            const res = await apiClient.post(`/admin/webhooks/${merchantId}/endpoints/${endpoint._id}/regenerate-secret`);
            setRevealedSecret(res.data.endpoint.secret);
            toast.success('Secret regenerated');
            setConfirmAction(null);
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to regenerate secret');
        } finally {
            setActionLoading(false);
        }
    };

    const confirmDelete = async () => {
        setActionLoading(true);
        try {
            await apiClient.delete(`/admin/webhooks/${merchantId}/endpoints/${endpoint._id}`);
            toast.success('Webhook deleted');
            setConfirmAction(null);
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to delete webhook');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            {revealedSecret && <SecretRevealBanner secret={revealedSecret} onDismiss={() => setRevealedSecret(null)} />}

            {endpoint && (
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${endpoint.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {endpoint.isActive ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secret configured
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={toggleActive} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50">
                            {endpoint.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => setConfirmAction('regenerate')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50">
                            <RotateCw className="w-3.5 h-3.5" /> Regenerate Secret
                        </button>
                        <button onClick={() => setConfirmAction('delete')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                </div>
            )}

            {endpoint && (
                <div className="grid grid-cols-2 gap-4 mb-5 text-xs text-gray-500">
                    <div>Created: {new Date(endpoint.createdAt).toLocaleString('en-IN')}</div>
                    <div>Updated: {new Date(endpoint.updatedAt).toLocaleString('en-IN')}</div>
                </div>
            )}

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {environment === 'live' ? 'Live' : 'Test'} Endpoint URL
            </label>
            <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={environment === 'live' ? 'https://example.com/webhooks/bluepay' : 'https://example.com/webhooks/bluepay-test'}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {environment === 'live' && <p className="text-xs text-gray-400 -mt-3 mb-4">Live endpoints must use HTTPS.</p>}

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Events</label>
            <div className="space-y-2 mb-5">
                {validEvents.map((evt) => (
                    <label key={evt} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={events.includes(evt)} onChange={() => toggleEvent(evt)} className="mt-0.5" />
                        <div>
                            <div className="text-sm font-mono font-medium text-gray-800">{evt}</div>
                            {EVENT_DESCRIPTIONS[evt] && <div className="text-xs text-gray-400">{EVENT_DESCRIPTIONS[evt]}</div>}
                        </div>
                    </label>
                ))}
            </div>

            <button onClick={save} disabled={saving} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : endpoint ? 'Save Changes' : `Create ${environment === 'live' ? 'Live' : 'Test'} Webhook`}
            </button>

            {confirmAction === 'regenerate' && (
                <ConfirmModal
                    title="Regenerate signing secret?"
                    message="The current secret will stop working immediately. Any integration verifying signatures with the old secret must be updated."
                    confirmLabel="Regenerate"
                    loading={actionLoading}
                    onConfirm={confirmRegenerate}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
            {confirmAction === 'delete' && (
                <ConfirmModal
                    title="Delete this webhook?"
                    message="This merchant will stop receiving webhook events for this environment. Delivery history is kept for audit purposes."
                    confirmLabel="Delete"
                    danger
                    loading={actionLoading}
                    onConfirm={confirmDelete}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------------
// Delivery history
// ---------------------------------------------------------------------
const DeliveryHistory = ({ merchantId }) => {
    const [data, setData] = useState({ deliveries: [], total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('');
    const [environment, setEnvironment] = useState('');
    const [page, setPage] = useState(1);
    const [resendingId, setResendingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get(`/admin/webhooks/${merchantId}/deliveries`, {
                params: { status: status || undefined, environment: environment || undefined, page, limit: PAGE_SIZE },
            });
            setData(res.data);
        } catch (err) {
            if (err?.isCanceled) return;
            setError(err.response?.data?.msg || 'Unable to load delivery history');
        } finally {
            setLoading(false);
        }
    }, [merchantId, status, environment, page]);

    useEffect(() => { load(); }, [load]);

    const resend = async (delivery) => {
        setResendingId(delivery._id);
        try {
            await apiClient.post(`/admin/webhooks/${merchantId}/deliveries/${delivery._id}/resend`);
            toast.success('Delivery queued for resend');
            load();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to queue resend');
        } finally {
            setResendingId(null);
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
                <div className="font-medium text-gray-700">Delivery History</div>
                <div className="flex items-center gap-2">
                    <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs">
                        <option value="">All statuses</option>
                        {Object.keys(DELIVERY_STATUS_STYLES).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs">
                        <option value="">All environments</option>
                        <option value="live">Live</option>
                        <option value="test">Test</option>
                    </select>
                    <button onClick={load} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center py-14 gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                    <button onClick={load} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="text-left px-5 py-2.5">Event</th>
                                    <th className="text-left px-5 py-2.5">Environment</th>
                                    <th className="text-left px-5 py-2.5">Status</th>
                                    <th className="text-left px-5 py-2.5">HTTP</th>
                                    <th className="text-left px-5 py-2.5">Attempts</th>
                                    <th className="text-left px-5 py-2.5">Created</th>
                                    <th className="text-left px-5 py-2.5">Delivered</th>
                                    <th className="text-left px-5 py-2.5">Message</th>
                                    <th className="text-right px-5 py-2.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading deliveries...</td></tr>
                                ) : (data.deliveries || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12">
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <Inbox className="w-5 h-5" /> No webhook deliveries found
                                            </div>
                                        </td>
                                    </tr>
                                ) : data.deliveries.map((d) => (
                                    <tr key={d._id} className="hover:bg-gray-50/60">
                                        <td className="px-5 py-2.5 font-mono text-xs text-gray-700">{d.event}</td>
                                        <td className="px-5 py-2.5 text-gray-500 capitalize">{d.environment}</td>
                                        <td className="px-5 py-2.5"><DeliveryStatusBadge status={d.status} /></td>
                                        <td className="px-5 py-2.5 text-gray-600">{d.responseCode ?? '—'}</td>
                                        <td className="px-5 py-2.5 text-gray-600">{d.attempts}</td>
                                        <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{new Date(d.createdAt).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{d.deliveredAt ? new Date(d.deliveredAt).toLocaleString('en-IN') : '—'}</td>
                                        <td className="px-5 py-2.5 text-gray-500 max-w-[200px] truncate" title={d.responseMessage}>{d.responseMessage || '—'}</td>
                                        <td className="px-5 py-2.5 text-right">
                                            {d.status === 'failed' && (
                                                <button
                                                    disabled={resendingId === d._id}
                                                    onClick={() => resend(d)}
                                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                                                >
                                                    <Send className="w-3 h-3" /> {resendingId === d._id ? 'Resending...' : 'Resend'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                        <span>Page {page} of {data.pages || 1} · {data.total || 0} deliveries</span>
                        <div className="flex items-center gap-2">
                            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button disabled={page >= (data.pages || 1)} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------
const Webhooks = () => {
    const [merchant, setMerchant] = useState(null);
    const [tab, setTab] = useState('live');
    const [endpoints, setEndpoints] = useState([]);
    const [validEvents, setValidEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        apiClient.get('/admin/webhooks/events').then((res) => setValidEvents(res.data.events || [])).catch(() => {});
    }, []);

    const loadEndpoints = useCallback(async () => {
        if (!merchant) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get(`/admin/webhooks/${merchant._id}/endpoints`);
            setEndpoints(res.data.endpoints || []);
        } catch (err) {
            if (err?.isCanceled) return;
            setError(err.response?.data?.msg || 'Unable to load webhook configuration');
        } finally {
            setLoading(false);
        }
    }, [merchant]);

    useEffect(() => { loadEndpoints(); }, [loadEndpoints]);

    const currentEndpoint = endpoints.find((e) => e.environment === tab) || null;

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-6 gap-4">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Webhooks</h1>
                <MerchantPicker selected={merchant} onSelect={(m) => { setMerchant(m); setEndpoints([]); }} />
            </div>

            {!merchant ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
                    <Inbox className="w-6 h-6" />
                    <span>Search and select a merchant to manage their webhook configuration</span>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
                        {['live', 'test'].map((env) => (
                            <button
                                key={env}
                                onClick={() => setTab(env)}
                                className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === env ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {env}
                                {endpoints.find((e) => e.environment === env) && (
                                    <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${endpoints.find((e) => e.environment === env).isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                )}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-center py-20 text-gray-400">
                            <RefreshCw className="w-6 h-6 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-2 text-red-500">
                            <AlertTriangle className="w-6 h-6" />
                            <span className="text-sm">{error}</span>
                            <button onClick={loadEndpoints} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                        </div>
                    ) : (
                        <div className="mb-6">
                            {/* key={tab} forces a clean remount when switching environments,
                                so an unsaved draft in the Test form can never bleed into Live. */}
                            <EndpointPanel
                                key={tab}
                                merchantId={merchant._id}
                                environment={tab}
                                endpoint={currentEndpoint}
                                validEvents={validEvents}
                                onChanged={loadEndpoints}
                            />
                        </div>
                    )}

                    <DeliveryHistory merchantId={merchant._id} />
                </>
            )}
        </Layout>
    );
};

export default Webhooks;
