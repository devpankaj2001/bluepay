import React, { useState } from 'react';
import {
    Shield, Lock, Smartphone, Monitor, Globe, Plus, Trash2, CheckCircle, XCircle, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';

// ------------------------------------------------------------
// Change Password Section
// ------------------------------------------------------------

const ChangePasswordSection = () => {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.current || !form.next || !form.confirm) {
            toast.error('Please fill all fields');
            return;
        }
        if (form.next !== form.confirm) {
            toast.error('New passwords do not match');
            return;
        }
        setSaving(true);
        try {
            await apiClient.post('/account/change-password', {
                currentPassword: form.current,
                newPassword: form.next,
                confirmPassword: form.confirm,
            });
            setSaving(false);
            toast.success('Password updated successfully');
            setForm({ current: '', next: '', confirm: '' });
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to update password');
        } finally { setSaving(false); }
    };

    const fields = [
        { key: 'current', label: 'Current Password' },
        { key: 'next', label: 'New Password' },
        { key: 'confirm', label: 'Confirm New Password' },
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Change Password</h2>
            <p className="text-sm text-gray-500 mb-6">Use a strong password you don't reuse on other sites.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map((f) => (
                    <div key={f.key}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}</label>
                        <div className="relative">
                            <input
                                type={show ? 'text' : 'password'}
                                value={form[f.key]}
                                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                                className="w-full px-4 py-3 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShow((s) => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-500/30"
                >
                    {saving ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
};

// ------------------------------------------------------------
// 2FA Section
// ------------------------------------------------------------

const TwoFactorSection = () => {
    const [enabled, setEnabled] = useState(false);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-xl">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Add an extra layer of security to your account.</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEnabled((e) => !e);
                        toast.error('Two-factor authentication is not available from the current backend.');
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : ''}`} />
                </button>
            </div>

            <div className={`mt-6 rounded-xl p-4 text-sm ${enabled ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                {enabled
                    ? 'Two-factor authentication is currently enabled. You will be asked for a verification code on new devices.'
                    : 'Two-factor authentication is currently disabled. We recommend enabling it for stronger account protection.'}
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// Active Sessions Section
// ------------------------------------------------------------

const ActiveSessionsSection = () => {
    const sessions = [];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Active Sessions</h2>
                <p className="text-xs text-gray-400 mt-1">Devices currently signed in to your account</p>
            </div>
            <div className="divide-y divide-gray-100">
                {sessions.map((s) => (
                    <div key={s.id} className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <Monitor className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    {s.device}
                                    {s.current && (
                                        <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">This device</span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.lastActive}</p>
                            </div>
                        </div>
                        {!s.current && (
                            <button
                                onClick={() => toast.error('Session management is not available from the current backend.')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Revoke
                            </button>
                        )}
                    </div>
                ))}
                {sessions.length === 0 && (
                    <div className="p-10 text-center text-sm text-gray-400">Session management is not available from the current backend.</div>
                )}
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// IP Whitelist Section
// ------------------------------------------------------------

const IPWhitelistSection = () => {
    const entries = [];
    const [newIp, setNewIp] = useState('');
    const [newLabel, setNewLabel] = useState('');

    const addEntry = () => {
        if (!newIp.trim()) {
            toast.error('Please enter an IP address');
            return;
        }
        toast.error('IP whitelisting is not available from the current backend.');
    };

    const removeEntry = () => {
        toast.error('IP whitelisting is not available from the current backend.');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Add IP Address</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                        placeholder="e.g. 103.21.244.10"
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Label (optional)"
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={addEntry}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" /> Add
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Whitelisted IPs</h2>
                    <p className="text-xs text-gray-400 mt-1">Only these IPs are allowed to access your API (if enforced)</p>
                </div>
                <div className="divide-y divide-gray-100">
                    {entries.map((e) => (
                        <div key={e.id} className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Globe className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="text-sm font-mono font-semibold text-gray-900">{e.ip}</p>
                                    <p className="text-xs text-gray-400">{e.label} · added {e.addedOn}</p>
                                </div>
                            </div>
                            <button onClick={() => removeEntry(e.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {entries.length === 0 && (
                        <div className="p-10 text-center text-sm text-gray-400">No IPs whitelisted yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// Security (module entry)
// ------------------------------------------------------------

const TABS = ['Change Password', '2FA', 'Active Sessions', 'IP Whitelist'];

const Security = ({ view }) => {
    const [tab, setTab] = useState(TABS.includes(view) ? view : 'Change Password');

    return (
        <div className="w-full pb-12 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-7 h-7 text-blue-600" /> Security
                </h1>
                <p className="text-sm text-gray-500 mt-1">Manage password, two-factor authentication, and access controls.</p>
            </div>

            <div className="flex flex-wrap gap-2 bg-gray-100 rounded-xl p-1 w-fit">
                {TABS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'Change Password' && <ChangePasswordSection />}
            {tab === '2FA' && <TwoFactorSection />}
            {tab === 'Active Sessions' && <ActiveSessionsSection />}
            {tab === 'IP Whitelist' && <IPWhitelistSection />}
        </div>
    );
};

export default Security;
