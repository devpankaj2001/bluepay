import React, { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';

const QuickStats = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { apiClient.get('/users/dashboard').then((response) => setData(response.data)).catch((requestError) => setError(requestError.response?.data?.msg || 'Unable to load statistics')); }, []);
    const wallet = data?.wallet || {};
    const summary = data?.walletSummary || {};
    const cards = [
        ['Available balance', `₹${Number(wallet.availableBalance || 0).toLocaleString('en-IN')}`],
        ['Locked balance', `₹${Number(wallet.lockedBalance || 0).toLocaleString('en-IN')}`],
        ['Successful payouts', summary.monthSuccess || 0],
        ['Failed payouts', summary.monthFailed || 0],
    ];
    return <div className="space-y-6"><div><h2 className="text-2xl font-semibold text-gray-900">Quick Stats</h2><p className="mt-1 text-sm text-gray-500">Live account statistics</p></div>{error ? <p className="text-sm text-red-600">{error}</p> : <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>)}</div>}</div>;
};

export default QuickStats;
