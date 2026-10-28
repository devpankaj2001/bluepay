import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import MerchantPicker from '../components/MerchantPicker';
import SecretRevealBanner from '../components/SecretRevealBanner';
import ConfirmModal from '../components/ConfirmModal';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import {
    RefreshCw, AlertTriangle, Inbox, KeyRound, RotateCw, Ban,
} from 'lucide-react';

const SCOPE_DESCRIPTIONS = {
    'payouts:read': 'List payouts, retrieve a payout, and check payout status',
    'payouts:write': 'Create a payout',
    'wallet:read': 'Read the merchant wallet balance overview',
};

const maskApiKey = (apiKey) => {
    if (!apiKey) return '—';
    if (apiKey.length <= 12) return apiKey;
    return `${apiKey.slice(0, 8)}${'•'.repeat(8)}${apiKey.slice(-4)}`;
};

const StatusBadge = ({ active }) => (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
        {active ? 'Active' : 'Revoked'}
    </span>
);

// ---------------------------------------------------------------------
// One environment's credential card (test or live)
// ---------------------------------------------------------------------
const CredentialCard = ({ merchantId, environment, credential, onChanged }) => {
    const [confirmAction, setConfirmAction] = useState(null); // 'rotate' | 'revoke'
    const [actionLoading, setActionLoading] = useState(false);
    const [revealedSecret, setRevealedSecret] = useState(null);

    const rotate = async () => {
        setActionLoading(true);
        try {
            const res = await apiClient.post(`/admin/developer/${merchantId}/credentials/${environment}/rotate`);
            setRevealedSecret(res.data.secret);
            toast.success(credential ? 'Credential regenerated' : 'Credential generated');
            setConfirmAction(null);
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to generate credential');
        } finally {
            setActionLoading(false);
        }
    };

    const revoke = async () => {
        setActionLoading(true);
        try {
            await apiClient.post(`/admin/developer/${merchantId}/credentials/${environment}/revoke`);
            toast.success('Credential revoked');
            setConfirmAction(null);
            onChanged();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to revoke credential');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            {revealedSecret && <SecretRevealBanner secret={revealedSecret} label="API secret" onDismiss={() => setRevealedSecret(null)} />}

            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${environment === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <h2 className="text-lg font-semibold text-gray-900 capitalize">{environment} Environment</h2>
                </div>
                {credential && <StatusBadge active={credential.active} />}
            </div>

            {!credential ? (
                <div className="text-center py-8">
                    <KeyRound className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-4">No {environment} credentials generated yet.</p>
                    <button
                        onClick={() => setConfirmAction('rotate')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                    >
                        Generate Credentials
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-1">API Key</div>
                        <code className="block bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 break-all">{maskApiKey(credential.apiKey)}</code>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-1">API Secret</div>
                        <code className="block bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-gray-700">{'•'.repeat(12)}{credential.secretLast4}</code>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>Created: {new Date(credential.createdAt).toLocaleString('en-IN')}</div>
                        <div>Last Rotated: {new Date(credential.lastRotatedAt).toLocaleString('en-IN')}</div>
                        <div>Last Used: {credential.lastUsedAt ? new Date(credential.lastUsedAt).toLocaleString('en-IN') : 'Never'}</div>
                        {credential.revokedAt && <div>Revoked: {new Date(credential.revokedAt).toLocaleString('en-IN')}</div>}
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Scopes</div>
                        <div className="space-y-1.5">
                            {(credential.scopes || []).map((scope) => (
                                <div key={scope} className="flex items-start gap-2 text-xs">
                                    <span className="font-mono font-semibold text-gray-700 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">{scope}</span>
                                    {SCOPE_DESCRIPTIONS[scope] && <span className="text-gray-400 mt-0.5">{SCOPE_DESCRIPTIONS[scope]}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <button
                            onClick={() => setConfirmAction('rotate')}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50"
                        >
                            <RotateCw className="w-3.5 h-3.5" /> Regenerate
                        </button>
                        {credential.active && (
                            <button
                                onClick={() => setConfirmAction('revoke')}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50"
                            >
                                <Ban className="w-3.5 h-3.5" /> Revoke
                            </button>
                        )}
                    </div>
                </div>
            )}

            {confirmAction === 'rotate' && (
                <ConfirmModal
                    title={credential ? 'Regenerate credentials?' : 'Generate credentials?'}
                    message={credential
                        ? 'The current API key and secret will stop working immediately. Any integration using them must be updated with the new pair.'
                        : `This will create a new ${environment} API key and secret for this merchant.`}
                    confirmLabel={credential ? 'Regenerate' : 'Generate'}
                    loading={actionLoading}
                    onConfirm={rotate}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
            {confirmAction === 'revoke' && (
                <ConfirmModal
                    title="Revoke this credential?"
                    message="The merchant's existing API key/secret for this environment will stop authenticating immediately. This cannot be undone - a new credential must be generated afterward."
                    confirmLabel="Revoke"
                    danger
                    loading={actionLoading}
                    onConfirm={revoke}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------
const Developers = () => {
    const [merchant, setMerchant] = useState(null);
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!merchant) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get(`/admin/developer/${merchant._id}/credentials`);
            setCredentials(res.data.credentials || []);
        } catch (err) {
            if (err?.isCanceled) return;
            setError(err.response?.data?.msg || 'Unable to load developer credentials');
        } finally {
            setLoading(false);
        }
    }, [merchant]);

    useEffect(() => { load(); }, [load]);

    const findCredential = (env) => credentials.find((c) => c.environment === env) || null;

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-6 gap-4">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Developer / API Credentials</h1>
                <MerchantPicker selected={merchant} onSelect={(m) => { setMerchant(m); setCredentials([]); }} />
            </div>

            {!merchant ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
                    <Inbox className="w-6 h-6" />
                    <span>Search and select a merchant to manage their API credentials</span>
                </div>
            ) : loading ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-center py-20 text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
            ) : error ? (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-2 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-sm">{error}</span>
                    <button onClick={load} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CredentialCard merchantId={merchant._id} environment="live" credential={findCredential('live')} onChanged={load} />
                    <CredentialCard merchantId={merchant._id} environment="test" credential={findCredential('test')} onChanged={load} />
                </div>
            )}
        </Layout>
    );
};

export default Developers;
