import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const Wallets = () => {
    const [data, setData] = useState({ rows: [], total: 0, totalAmount: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 25;

    const load = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/admin/reports/wallets', { params: { page, limit, search: search || undefined } });
            setData(response.data);
        } catch (error) {
            if (!error?.isCanceled) toast.error(error.response?.data?.msg || 'Unable to load wallets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        load();
    };

    const exportCsv = async () => {
        try {
            const response = await apiClient.get('/admin/reports/export', {
                params: { type: 'wallets', format: 'csv', search: search || undefined },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'bluepay_wallets_report.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to export report');
        }
    };

    const totalPages = Math.max(1, Math.ceil((data.total || 0) / limit));

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-8 mb-6 gap-4">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Wallets</h1>
                <div className="flex items-center gap-3">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search merchant name / email"
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </form>
                    <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={load} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase font-medium">Total Wallets</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">{(data.total || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase font-medium">Total Balance (page)</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">₹{(data.totalAmount || 0).toLocaleString('en-IN')}</div>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="text-left px-5 py-3">Merchant</th>
                                <th className="text-right px-5 py-3">Available</th>
                                <th className="text-right px-5 py-3">Locked</th>
                                <th className="text-right px-5 py-3">Total Payout Sent</th>
                                <th className="text-right px-5 py-3">Total Funding</th>
                                <th className="text-right px-5 py-3">Successful</th>
                                <th className="text-right px-5 py-3">Failed</th>
                                <th className="text-left px-5 py-3">Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading wallets...</td></tr>
                            ) : (data.rows || []).length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No wallets found</td></tr>
                            ) : data.rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/60">
                                    <td className="px-5 py-3 text-gray-700">
                                        <div className="font-medium">{row.merchant?.name}</div>
                                        <div className="text-xs text-gray-400">{row.merchant?.email}</div>
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium text-gray-900">₹{Number(row.availableBalance || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3 text-right text-gray-600">₹{Number(row.lockedBalance || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3 text-right text-gray-600">₹{Number(row.totalPayoutSent || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3 text-right text-gray-600">₹{Number(row.totalFunding || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3 text-right text-emerald-600">{row.successfulPayouts || 0}</td>
                                    <td className="px-5 py-3 text-right text-red-500">{row.failedPayouts || 0}</td>
                                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{row.updatedAt ? new Date(row.updatedAt).toLocaleString('en-IN') : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Wallets;
