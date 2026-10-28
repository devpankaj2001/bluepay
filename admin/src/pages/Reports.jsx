import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Wallet, Activity, Download, ArrowUpRight } from 'lucide-react';

const REPORT_CARDS = [
    { type: 'transactions', title: 'Transaction Report', description: 'All merchant ledger transactions (credits & debits).', icon: ArrowRightLeft, path: '/transactions' },
    { type: 'wallets', title: 'Wallet Report', description: 'Available balance, locked balance and funding per merchant.', icon: Wallet, path: '/wallets' },
    { type: 'api-usage', title: 'API Usage Report', description: 'API request volume, success rate and response times.', icon: Activity, path: '/api-usage' },
];

const Reports = () => {
    const navigate = useNavigate();
    const [exporting, setExporting] = useState(null);

    const exportReport = async (type, format) => {
        setExporting(`${type}-${format}`);
        try {
            const response = await apiClient.get('/admin/reports/export', {
                params: { type, format },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `bluepay_${type}_report.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Report downloaded');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Failed to export report');
        } finally {
            setExporting(null);
        }
    };

    return (
        <Layout>
            <div className="mt-8 mb-6">
                <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Reports</h1>
                <p className="text-gray-500 mt-1">Browse detailed platform reports or export them as CSV / PDF.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {REPORT_CARDS.map((card) => (
                    <div key={card.type} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                            <card.icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 flex-1">{card.description}</p>
                        <div className="flex items-center gap-2 mt-5">
                            <button
                                onClick={() => navigate(card.path)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                            >
                                View <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                disabled={exporting === `${card.type}-csv`}
                                onClick={() => exportReport(card.type, 'csv')}
                                title="Export CSV"
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                <Download className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                                disabled={exporting === `${card.type}-pdf`}
                                onClick={() => exportReport(card.type, 'pdf')}
                                title="Export PDF"
                                className="px-2.5 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-500"
                            >
                                PDF
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Layout>
    );
};

export default Reports;
