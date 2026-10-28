import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getAllUsers, updateUserStatus, createUser } from '../services/userService';
import toast from 'react-hot-toast';
import { Search, Plus, X, ChevronLeft, ChevronRight, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

const KYC_BADGE = {
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    unverified: 'bg-gray-100 text-gray-600',
};

const PAGE_SIZE = 20;

const Users = () => {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [kycStatus, setKycStatus] = useState('');
    const [status, setStatus] = useState('');
    const [accountType, setAccountType] = useState('');

    const navigate = useNavigate();
    const debounceRef = useRef(null);

    // Debounce free-text search so every keystroke doesn't hit the API.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchInput]);

    // Confirmation modal state for the status toggle action
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [statusActionLoading, setStatusActionLoading] = useState(false);

    // Create User Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({
        first_name: '', last_name: '', email: '', mobile_number: '', password: '',
        kycStatus: 'unverified', accountType: 'corporate', domain: ''
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllUsers({ search, kycStatus, status, accountType, page, limit: PAGE_SIZE });
            setUsers(data.users || []);
            setTotal(data.total || 0);
        } catch (err) {
            if (err?.isCanceled || err?.message === 'canceled') return;
            setError(err.response?.data?.msg || 'Failed to load merchants');
        } finally {
            setLoading(false);
        }
    }, [search, kycStatus, status, accountType, page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const requestStatusToggle = (user) => setConfirmTarget(user);

    const confirmStatusToggle = async () => {
        if (!confirmTarget) return;
        const newStatus = confirmTarget.status === 1 ? 0 : 1;
        setStatusActionLoading(true);
        try {
            await updateUserStatus(confirmTarget._id, { status: newStatus });
            toast.success(`Merchant ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`);
            setConfirmTarget(null);
            fetchUsers();
        } catch {
            toast.error('Failed to update merchant status');
        } finally {
            setStatusActionLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await createUser(newUser);
            toast.success('Merchant created successfully');
            setShowCreateModal(false);
            setNewUser({ first_name: '', last_name: '', email: '', mobile_number: '', password: '', kycStatus: 'unverified', accountType: 'corporate', domain: '' });
            setPage(1);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to create merchant');
        } finally {
            setCreating(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasActiveFilters = search || kycStatus || status || accountType;

    return (
        <Layout>
            {/* Header Section */}
            <div className="flex items-center justify-between gap-3 mt-8 mb-8">
                <h1 className="text-[3rem] font-medium text-gray-900 tracking-tight leading-none">Merchants</h1>
                <button onClick={fetchUsers} className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 flex items-center justify-center bg-white shadow-sm transition-colors" title="Refresh">
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6 sm:p-8 relative mb-6">
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

                    <select value={kycStatus} onChange={(e) => { setKycStatus(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">All KYC statuses</option>
                        <option value="unverified">Unverified</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">All account statuses</option>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>

                    <select value={accountType} onChange={(e) => { setAccountType(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">All account types</option>
                        <option value="corporate">Corporate</option>
                        <option value="individual">Individual</option>
                    </select>

                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearchInput(''); setSearch(''); setKycStatus(''); setStatus(''); setAccountType(''); setPage(1); }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                            Clear filters
                        </button>
                    )}

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus size={20} /> Create Merchant
                    </button>
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
                    <button onClick={fetchUsers} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business / Merchant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <img className="h-10 w-10 rounded-full bg-gray-200" src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`} alt="" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.company_name || `${user.first_name} ${user.last_name}`}</div>
                                                    <div className="text-sm text-gray-500">{user.first_name} {user.last_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{user.email}</div>
                                            <div className="text-sm text-gray-500">{user.mobile_number}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{user.accountType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${KYC_BADGE[user.kycStatus] || KYC_BADGE.unverified}`}>
                                                {user.kycStatus || 'unverified'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {user.status === 1 ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => navigate(`/users/${user._id}/details`)}
                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition mr-3 text-xs font-bold font-sans"
                                                title="View Merchant Details"
                                            >View Details</button>
                                            <button
                                                onClick={() => requestStatusToggle(user)}
                                                className={`${user.status === 1 ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} font-bold transition-colors duration-200`}
                                            >
                                                {user.status === 1 ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {users.length === 0 && (
                        <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                            <Inbox className="w-6 h-6 text-gray-300" />
                            {hasActiveFilters ? 'No merchants match the current search/filters.' : 'No merchants found.'}
                        </div>
                    )}
                    {users.length > 0 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
                            <span>Page {page} of {totalPages} · {total} merchant{total === 1 ? '' : 's'}</span>
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

            {/* Status Change Confirmation Modal */}
            {confirmTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">
                            {confirmTarget.status === 1 ? 'Deactivate merchant?' : 'Activate merchant?'}
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">
                            {confirmTarget.status === 1
                                ? `${confirmTarget.first_name} ${confirmTarget.last_name} will no longer be able to access their account.`
                                : `${confirmTarget.first_name} ${confirmTarget.last_name} will regain access to their account.`}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmTarget(null)} disabled={statusActionLoading} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button
                                onClick={confirmStatusToggle}
                                disabled={statusActionLoading}
                                className={`px-4 py-2 rounded-lg text-white font-medium ${confirmTarget.status === 1 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}
                            >
                                {statusActionLoading ? 'Please wait...' : confirmTarget.status === 1 ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Create New Merchant</h2>
                            <button onClick={() => setShowCreateModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">First Name</label>
                                    <input type="text" required className="w-full border rounded p-2" value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Last Name</label>
                                    <input type="text" required className="w-full border rounded p-2" value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input type="email" required className="w-full border rounded p-2" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Mobile</label>
                                    <input type="text" required className="w-full border rounded p-2" value={newUser.mobile_number} onChange={e => setNewUser({ ...newUser, mobile_number: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Password</label>
                                    <input type="password" required className="w-full border rounded p-2" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Account Type</label>
                                    <select className="w-full border rounded p-2" value={newUser.accountType} onChange={e => setNewUser({ ...newUser, accountType: e.target.value })}>
                                        <option value="corporate">Corporate</option>
                                        <option value="individual">Individual</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Domain</label>
                                <input type="text" className="w-full border rounded p-2" placeholder="e.g. merchant.com" value={newUser.domain} onChange={e => setNewUser({ ...newUser, domain: e.target.value })} />
                            </div>
                            <button type="submit" disabled={creating} className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </Layout>
    );
};

export default Users;
