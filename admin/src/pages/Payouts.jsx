import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import { Search, RefreshCw, RotateCcw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const STATUS_STYLES = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_ICONS = {
    success: <CheckCircle className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    processing: <Loader2 className="w-3 h-3 animate-spin" />,
    failed: <XCircle className="w-3 h-3" />,
};

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.unknown}`}>
        {STATUS_ICONS[status]} {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
);

const Payouts = () => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [actingId, setActingId] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/payouts');
            setPayouts(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            if (!error?.isCanceled) toast.error(error.response?.data?.msg || 'Unable to load payouts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        return payouts.filter((p) => {
            if (statusFilter !== 'all' && p.status !== statusFilter) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                p.beneficiary_name?.toLowerCase().includes(q) ||
                p.account_number?.includes(q) ||
                p.txn_id?.toLowerCase().includes(q) ||
                p.userId?.email?.toLowerCase().includes(q) ||
                `${p.userId?.first_name || ''} ${p.userId?.last_name || ''}`.toLowerCase().includes(q)
            );
        });
    }, [payouts, search, statusFilter]);

    const retryPayout = async (id) => {
        setActingId(id);
        try {
            await apiClient.post(`/payouts/${id}/retry`);
            toast.success('Retry initiated');
            load();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Retry failed');
        } finally {
            setActingId(null);
        }
    };

    const checkStatus = async (id) => {
        setActingId(id);
        try {
            await apiClient.post(`/payouts/${id}/status-check`);
            toast.success('Status refreshed');
            load();
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Status check failed');
        } finally {
            setActingId(null);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-6 gap-4">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Payouts</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search beneficiary, account, txn, merchant"
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                        <option value="unknown">Unknown</option>
                    </select>
                    <button onClick={load} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="text-left px-5 py-3">Date</th>
                                <th className="text-left px-5 py-3">Merchant</th>
                                <th className="text-left px-5 py-3">Beneficiary</th>
                                <th className="text-left px-5 py-3">Account</th>
                                <th className="text-right px-5 py-3">Amount</th>
                                <th className="text-left px-5 py-3">Status</th>
                                <th className="text-left px-5 py-3">Txn ID</th>
                                <th className="text-right px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading payouts...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No payouts found</td></tr>
                            ) : filtered.map((p) => (
                                <tr key={p._id} className="hover:bg-gray-50/60">
                                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{new Date(p.createdAt).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3 text-gray-700">
                                        <div className="font-medium">{p.userId?.first_name} {p.userId?.last_name}</div>
                                        <div className="text-xs text-gray-400">{p.userId?.email}</div>
                                    </td>
                                    <td className="px-5 py-3 text-gray-700">{p.beneficiary_name}</td>
                                    <td className="px-5 py-3 text-gray-500">{p.account_number}<div className="text-xs text-gray-400">{p.ifsc_code}</div></td>
                                    <td className="px-5 py-3 text-right font-medium text-gray-900">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                                    <td className="px-5 py-3 text-gray-500">{p.txn_id || '—'}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                disabled={actingId === p._id}
                                                onClick={() => checkStatus(p._id)}
                                                title="Check status with provider"
                                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                                            </button>
                                            {(p.status === 'failed' || p.status === 'unknown' || p.status === 'processing') && (
                                                <button
                                                    disabled={actingId === p._id}
                                                    onClick={() => retryPayout(p._id)}
                                                    title="Retry payout"
                                                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Payouts;
