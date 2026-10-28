import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Inbox, Search } from 'lucide-react';
import apiClient from '../api/apiClient';

const RecentActivity = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    useEffect(() => { apiClient.get('/activity/user', { params: { limit: 100 } }).then((response) => setActivities(response.data.data || [])).catch((requestError) => setError(requestError.response?.data?.msg || 'Unable to load activity')).finally(() => setLoading(false)); }, []);
    const filtered = useMemo(() => { const term = search.toLowerCase().trim(); return activities.filter((item) => !term || `${item.action} ${item.description} ${item.resourceType}`.toLowerCase().includes(term)); }, [activities, search]);
    return <div className="w-full pb-12"><div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1><p className="mt-1 text-sm text-gray-500">Activity recorded by BluePay services.</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activity" className="w-56 rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm" /></div></div>{loading ? <p className="p-8 text-sm text-gray-500">Loading activity...</p> : error ? <p className="p-8 text-sm text-red-600">{error}</p> : <div className="overflow-hidden rounded-xl border border-gray-100 bg-white"><div className="border-b border-gray-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Activity className="h-4 w-4 text-blue-600" />Activity Log</h2><p className="mt-1 text-xs text-gray-400">{filtered.length} recorded results</p></div>{filtered.length ? <div className="divide-y divide-gray-100">{filtered.map((item) => <div key={item._id} className="flex gap-4 px-5 py-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Activity className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-gray-900">{item.action}</p><p className="mt-0.5 text-sm text-gray-500">{item.description || item.resourceType || 'Account activity'}</p><p className="mt-1 text-xs text-gray-400">{item.status} · {new Date(item.createdAt).toLocaleString('en-IN')}</p></div></div>)}</div> : <div className="py-16 text-center"><Inbox className="mx-auto h-6 w-6 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-600">No recent activity</p></div>}</div>}</div>;
};

export default RecentActivity;
