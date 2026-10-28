import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import { updateUserStatus } from '../services/userService';
import toast from 'react-hot-toast';
import {
    User, Mail, Phone, Calendar, ShieldCheck,
    ArrowLeft, Wallet, AlertTriangle,
    CheckCircle, XCircle, Clock, Lock, ExternalLink, RefreshCw
} from 'lucide-react';

const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return '—';
    const str = String(accountNumber);
    if (str.length <= 4) return str;
    return `${'X'.repeat(str.length - 4)}${str.slice(-4)}`;
};

const UserDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [fundRequests, setFundRequests] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusActionLoading, setStatusActionLoading] = useState(false);

    const fetchUserData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // First fetch core details
            const userRes = await apiClient.get(`/users/${id}/dashboard`);
            setUser(userRes.data.user);
            setWallet(userRes.data.wallet);

            // Fetch complex metrics (payouts, deposits) - admin-scoped, ownership
            // of `id` is enforced server-side by the isAdmin + route param lookup,
            // never by anything the frontend supplies.
            const detailsRes = await apiClient.get(`/payouts/user/${id}`);
            setPayouts(detailsRes.data.payouts || []);
            setFundRequests(detailsRes.data.fundRequests || []);
            setMetrics(detailsRes.data.metrics || null);
        } catch (err) {
            if (err?.isCanceled || err?.message === 'canceled') return;
            setError(err.response?.data?.msg || 'Failed to load merchant details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchUserData(); }, [fetchUserData]);

    const handleFundAction = async (depositId, status) => {
        try {
            await apiClient.put(`/funds/${depositId}/status`, { status, adminRemarks: 'Processed by SuperAdmin' });
            toast.success(`Deposit request ${status} successfully`);
            fetchUserData(); // Refresh data immediately
        } catch {
            toast.error('Failed to update request');
        }
    };

    const confirmStatusChange = async () => {
        if (!user) return;
        const newStatus = user.status === 1 ? 0 : 1;
        setStatusActionLoading(true);
        try {
            await updateUserStatus(user._id, { status: newStatus });
            toast.success(`Merchant ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`);
            setShowStatusConfirm(false);
            fetchUserData();
        } catch {
            toast.error('Failed to update merchant status');
        } finally {
            setStatusActionLoading(false);
        }
    };

    if (loading) return <Layout><div className="flex h-[200px] justify-center items-center"><Clock className="animate-spin text-indigo-500 w-8 h-8" /></div></Layout>;
    if (error) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-sm">{error}</span>
                    <button onClick={fetchUserData} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                </div>
            </Layout>
        );
    }
    if (!user) return <Layout><div>Merchant not found.</div></Layout>;

    return (
        <Layout>
            <div className="w-full animation-fade-in pb-12 max-w-6xl mx-auto">
                {/* Top Nav */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-gray-500 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => navigate('/users')}>
                        <ArrowLeft className="w-4 h-4" /> <span>Back to Merchants</span>
                    </div>
                    <button onClick={fetchUserData} title="Refresh" className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 bg-white shadow-sm">
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 z-0"></div>

                    <div className="flex items-center gap-6 relative z-10">
                        <img
                            src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random&size=128`}
                            alt="Profile"
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-md"
                        />
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.first_name} {user.last_name}</h1>
                                {user.status === 1 ? (
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">ACTIVE</span>
                                ) : (
                                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">LOCKED <Lock className="w-3 h-3 inline pb-0.5" /></span>
                                )}
                                <Link
                                    to="/kyc"
                                    title="Open KYC review workflow"
                                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${user.kycStatus === 'verified' ? 'bg-green-50 text-green-600 border-green-200' : user.kycStatus === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" /> KYC: {user.kycStatus || 'unverified'} <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                            <p className="text-gray-500 font-medium">#{user._id}</p>
                        </div>
                    </div>

                    <div className="relative z-10 w-full sm:w-auto flex justify-end">
                        <button
                            onClick={() => setShowStatusConfirm(true)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${user.status === 1 ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'}`}
                        >
                            {user.status === 1 ? 'Deactivate Merchant' : 'Activate Merchant'}
                        </button>
                    </div>
                </div>

                {showStatusConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-2">
                                {user.status === 1 ? 'Deactivate merchant?' : 'Activate merchant?'}
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                {user.status === 1
                                    ? `${user.first_name} ${user.last_name} will no longer be able to access their account.`
                                    : `${user.first_name} ${user.last_name} will regain access to their account.`}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowStatusConfirm(false)} disabled={statusActionLoading} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button
                                    onClick={confirmStatusChange}
                                    disabled={statusActionLoading}
                                    className={`px-4 py-2 rounded-lg text-white font-medium ${user.status === 1 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}
                                >
                                    {statusActionLoading ? 'Please wait...' : user.status === 1 ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Core Identity</h2>
                        <div className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                            <span className="text-gray-500 flex items-center gap-2"><Mail className="w-4 h-4" /> Email address</span>
                            <span className="font-semibold text-gray-900">{user.email}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                            <span className="text-gray-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Phone number</span>
                            <span className="font-semibold text-gray-900">{user.mobile_number}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                            <span className="text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> User since</span>
                            <span className="font-semibold text-gray-900">{new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                            <span className="text-gray-500 flex items-center gap-2"><User className="w-4 h-4" /> Account Type</span>
                            <span className="font-semibold text-gray-900 capitalize">{user.accountType}</span>
                        </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="bg-gradient-to-br from-gray-900 to-indigo-950 p-6 rounded-2xl border border-gray-800 shadow-lg text-white">
                        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Financial Health
                        </h2>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <p className="text-gray-400 text-xs mb-1">Available Budget</p>
                                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">₹{wallet?.availableBalance?.toLocaleString() || '0'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs mb-1">Locked Transit</p>
                                <p className="text-xl font-bold text-orange-400">₹{wallet?.lockedBalance?.toLocaleString() || '0'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
                            <div>
                                <p className="text-gray-400 text-[10px] uppercase">Lifetime Added</p>
                                <p className="font-bold text-sm text-gray-100">₹{metrics?.totalFundAdded?.toLocaleString() || '0'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-[10px] uppercase">Payouts Sent</p>
                                <p className="font-bold text-sm text-gray-100">₹{metrics?.totalPaidOut?.toLocaleString() || '0'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-[10px] uppercase">Failed (Loss)</p>
                                <p className="font-bold text-sm text-red-400">₹{metrics?.totalFailedAmount?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deposit Operations */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        Admin Actions: Fund Requests <span className="bg-indigo-100 text-indigo-700 text-xs py-0.5 px-2 rounded-full font-bold">{fundRequests.filter(f => f.status === 'pending').length} Action Required</span>
                    </h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {fundRequests.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTR Ref No</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {fundRequests.map((req) => (
                                        <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                                {new Date(req.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900 border border-gray-200 px-3 py-1 rounded inline-block bg-gray-50">₹{req.amount.toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                                {req.utr_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                {req.status === 'pending' && <span className="bg-orange-100 text-orange-700 font-semibold px-2 py-1 rounded-md text-xs">Pending Review</span>}
                                                {req.status === 'approved' && <span className="bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-md text-xs">Approved</span>}
                                                {req.status === 'rejected' && <span className="bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-md text-xs">Rejected</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {req.status === 'pending' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleFundAction(req._id, 'approved')} className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded-lg transition" title="Approve & Credit Wallet"><CheckCircle className="w-5 h-5" /></button>
                                                        <button onClick={() => handleFundAction(req._id, 'rejected')} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="Reject Fake Request"><XCircle className="w-5 h-5" /></button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Closed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500 text-sm">No fund deposit requests ever made.</div>
                        )}
                    </div>
                </div>

                {/* API Logs / Payouts Heatmap simulated table */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        Recent API Payout Transmissions
                    </h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 relative">
                        {payouts.length > 0 ? (
                            <div className="space-y-4">
                                {payouts.map(p => (
                                    <div key={p._id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-6 px-6 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold font-serif shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                                                {p.beneficiary_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{p.beneficiary_name}</p>
                                                <p className="text-xs text-gray-500">AC: {maskAccountNumber(p.account_number)} | IFSC: <span className="font-medium text-gray-700">{p.ifsc_code}</span></p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">₹{p.amount.toLocaleString()}</p>
                                            <p className="flex justify-end mt-1 items-center gap-1">
                                                {p.status === 'success' ? <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sent</span> :
                                                    p.status === 'failed' ? <span className="text-xs text-red-600 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span> :
                                                        <span className="text-xs text-orange-500 font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Processing</span>}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 text-sm py-4">No API transmissions logged yet.</div>
                        )}
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default UserDetails;
