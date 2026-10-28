import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Building2,
    Wallet as WalletIcon,
    Clock,
    FileText,
    RefreshCw,
    Send,
    CheckCircle,
    AlertCircle,
    Copy,
    Check,
    Upload,
    X,
    ImageIcon,
    Info,
    TrendingUp,
    TrendingDown,
    XCircle,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    Filter,
    ChevronRight,
    Download,
    Search,
    ChevronDown,
    FileDown,
    CreditCard,
    Lock,
    CircleDollarSign
} from 'lucide-react';

import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';


/* ============================================================
   HELPERS
============================================================ */

const formatINR = (value = 0) => {
    return `₹${Number(value || 0).toLocaleString('en-IN')}`;
};

const formatDateTime = (date) => {
    if (!date) return '—';

    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// A fresh key per submission - the backend requires this header on POST
// /funds (see middleware/idempotencyMiddleware.js). Mirrors the same
// generation pattern already used for payouts in Payouts.jsx.
const generateDepositIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `deposit-${crypto.randomUUID()}`;
    }
    return `deposit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};


/* ============================================================
   COPY ROW
============================================================ */

const CopyRow = ({ label, value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value || '');
            setCopied(true);
            toast.success(`${label} copied!`);

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch {
            toast.error('Unable to copy');
        }
    };

    return (
        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 group">
            <span className="text-sm text-gray-500">
                {label}
            </span>

            <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                    {value || 'N/A'}
                </span>

                <button
                    type="button"
                    onClick={handleCopy}
                    title={`Copy ${label}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                >
                    {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>
        </div>
    );
};


/* ============================================================
   STATUS BADGE
============================================================ */

const StatusBadge = ({ status }) => {

    const normalizedStatus = String(status || '').toLowerCase();

    const config = {
        approved: {
            label: 'Approved',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: <CheckCircle className="w-3 h-3" />
        },

        success: {
            label: 'Success',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: <CheckCircle className="w-3 h-3" />
        },

        pending: {
            label: 'Pending',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: <Clock className="w-3 h-3" />
        },

        processing: {
            label: 'Processing',
            className: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: <RefreshCw className="w-3 h-3" />
        },

        rejected: {
            label: 'Rejected',
            className: 'bg-red-50 text-red-700 border-red-200',
            icon: <XCircle className="w-3 h-3" />
        },

        failed: {
            label: 'Failed',
            className: 'bg-red-50 text-red-700 border-red-200',
            icon: <XCircle className="w-3 h-3" />
        }
    };

    const current = config[normalizedStatus] || {
        label: status || 'Unknown',
        className: 'bg-gray-50 text-gray-600 border-gray-200',
        icon: <AlertCircle className="w-3 h-3" />
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.className}`}
        >
            {current.icon}
            {current.label}
        </span>
    );
};


/* ============================================================
   STAT CARD
============================================================ */

const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    iconClass = 'bg-blue-600',
    valueClass = 'text-gray-900'
}) => {

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">

            <div className="flex items-start justify-between">

                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {title}
                    </p>

                    <p className={`text-2xl font-bold mt-2 ${valueClass}`}>
                        {value}
                    </p>

                    {subtitle && (
                        <p className="text-xs text-gray-400 mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass}`}
                >
                    <Icon className="w-5 h-5 text-white" />
                </div>

            </div>

        </div>
    );
};


/* ============================================================
   WALLET OVERVIEW
============================================================ */

const WalletOverviewSection = ({ onNavigate }) => {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [activeTransaction, setActiveTransaction] = useState('all');


    /* ---------------------------------------------------------
       FETCH WALLET
    --------------------------------------------------------- */

    const fetchOverview = useCallback(async () => {

        setLoading(true);

        try {

            const params = new URLSearchParams();

            if (startDate) {
                params.append('startDate', startDate);
            }

            if (endDate) {
                params.append('endDate', endDate);
            }

            const query = params.toString();

            const response = await apiClient.get(
                `/funds/wallet-overview${query ? `?${query}` : ''}`
            );

            setData(response.data);

        } catch (error) {

            if (
                error?.isCanceled ||
                error?.message === 'canceled'
            ) {
                return;
            }

            toast.error(
                error?.response?.data?.msg ||
                'Failed to load wallet data'
            );

        } finally {

            setLoading(false);

        }

    }, [startDate, endDate]);


    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);


    /* ---------------------------------------------------------
       DATA
    --------------------------------------------------------- */

    const wallet = data?.wallet || {};
    const metrics = data?.metrics || {};

    const fundRequests = data?.fundRequests || [];
    const payouts = data?.payouts || [];


    const availableBalance =
        Number(wallet?.availableBalance || 0);

    const lockedBalance =
        Number(wallet?.lockedBalance || 0);

    const totalBalance =
        availableBalance + lockedBalance;


    /*
       Existing backend may already provide some metrics.
       We safely fallback to calculated values where possible.
    */

    const totalAdded =
        Number(metrics?.totalAdded || 0);

    const totalPayoutSent =
        Number(metrics?.totalPayoutSent || 0);


    const pendingFunds =
        fundRequests
            .filter(
                item =>
                    String(item.status).toLowerCase() === 'pending'
            )
            .reduce(
                (sum, item) =>
                    sum + Number(item.amount || 0),
                0
            );


    const todayString =
        new Date().toISOString().split('T')[0];


    const todaysCredits =
        fundRequests
            .filter(item => {

                if (
                    String(item.status).toLowerCase() !==
                    'approved'
                ) {
                    return false;
                }

                return (
                    new Date(item.createdAt)
                        .toISOString()
                        .split('T')[0] === todayString
                );
            })
            .reduce(
                (sum, item) =>
                    sum + Number(item.amount || 0),
                0
            );


    const todaysDebits =
        payouts
            .filter(item => {

                const status =
                    String(item.status).toLowerCase();

                if (
                    status !== 'success' &&
                    status !== 'processing' &&
                    status !== 'pending'
                ) {
                    return false;
                }

                return (
                    new Date(item.createdAt)
                        .toISOString()
                        .split('T')[0] === todayString
                );
            })
            .reduce(
                (sum, item) =>
                    sum + Number(item.amount || 0),
                0
            );


    /* ---------------------------------------------------------
       UNIFIED TRANSACTIONS
    --------------------------------------------------------- */

    const transactions = [

        ...fundRequests.map(item => ({
            id: item._id,
            date: item.createdAt,
            type: 'credit',
            title: 'Bank Transfer',
            description:
                item.utr_number
                    ? `UTR: ${item.utr_number}`
                    : 'Manual fund request',
            amount: Number(item.amount || 0),
            status: item.status,
            reference: item.utr_number
        })),

        ...payouts.map(item => ({
            id: item._id,
            date: item.createdAt,
            type: 'debit',
            title: 'Payout',
            description:
                item.beneficiary_name ||
                'Beneficiary payout',
            amount: Number(item.amount || 0),
            status: item.status,
            reference: item.txn_id
        }))

    ]
        .sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        )
        .slice(0, 10);


    const filteredTransactions =
        activeTransaction === 'all'
            ? transactions
            : transactions.filter(
                item =>
                    item.type === activeTransaction
            );


    /* ---------------------------------------------------------
       RENDER
    --------------------------------------------------------- */

    return (

        <div className="w-full pb-12 space-y-7 animate-fade-in">


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                <div>

                    <div className="flex items-center gap-3">

                        <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <WalletIcon className="w-5 h-5 text-white" />
                        </div>

                        <div>

                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                Wallet Overview
                            </h1>

                            <p className="text-sm text-gray-500 mt-1">
                                Manage your balance and track wallet transactions
                            </p>

                        </div>

                    </div>

                </div>


                <button
                    type="button"
                    onClick={() =>
                        onNavigate &&
                        onNavigate('Add Funds')
                    }
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 text-sm"
                >
                    <CircleDollarSign className="w-4 h-4" />
                    Add Funds
                    <ChevronRight className="w-4 h-4" />
                </button>

            </div>


            {/* ==================================================
                MAIN BALANCE
            ================================================== */}

            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-7 sm:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">

                <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />

                <div className="absolute -left-16 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-3xl" />

                <div className="relative z-10">

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

                        <div>

                            <p className="text-blue-200 text-sm font-medium">
                                Available Balance
                            </p>

                            <h2 className="text-4xl sm:text-5xl font-bold mt-2 tracking-tight">

                                {loading
                                    ? '₹—'
                                    : formatINR(availableBalance)
                                }

                            </h2>

                            <div className="flex flex-wrap items-center gap-3 mt-4">

                                <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs">
                                    <Lock className="w-3.5 h-3.5" />
                                    Locked: {formatINR(lockedBalance)}
                                </span>

                                <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs">
                                    <WalletIcon className="w-3.5 h-3.5" />
                                    Total: {formatINR(totalBalance)}
                                </span>

                            </div>

                        </div>


                        <div className="bg-white/10 border border-white/10 rounded-2xl px-5 py-4 min-w-[190px]">

                            <p className="text-xs text-blue-200">
                                Wallet Status
                            </p>

                            <div className="flex items-center gap-2 mt-2">

                                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />

                                <span className="font-semibold text-sm">
                                    Active
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            {/* ==================================================
                6 STAT CARDS
            ================================================== */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

                <StatCard
                    icon={WalletIcon}
                    title="Available Balance"
                    value={
                        loading
                            ? '₹—'
                            : formatINR(availableBalance)
                    }
                    subtitle="Ready for payouts"
                    iconClass="bg-blue-600"
                />

                <StatCard
                    icon={Lock}
                    title="Locked Balance"
                    value={
                        loading
                            ? '₹—'
                            : formatINR(lockedBalance)
                    }
                    subtitle="Currently in transit"
                    iconClass="bg-indigo-600"
                />

                <StatCard
                    icon={CircleDollarSign}
                    title="Total Balance"
                    value={
                        loading
                            ? '₹—'
                            : formatINR(totalBalance)
                    }
                    subtitle="Available + locked"
                    iconClass="bg-violet-600"
                />

                <StatCard
                    icon={TrendingUp}
                    title="Today's Credit"
                    value={formatINR(todaysCredits)}
                    subtitle="Approved funds added today"
                    iconClass="bg-emerald-600"
                    valueClass="text-emerald-700"
                />

                <StatCard
                    icon={TrendingDown}
                    title="Today's Debit"
                    value={formatINR(todaysDebits)}
                    subtitle="Payouts initiated today"
                    iconClass="bg-rose-600"
                    valueClass="text-rose-600"
                />

                <StatCard
                    icon={Clock}
                    title="Pending Funds"
                    value={formatINR(pendingFunds)}
                    subtitle="Awaiting verification"
                    iconClass="bg-amber-500"
                    valueClass="text-amber-700"
                />

            </div>


            {/* ==================================================
                DATE FILTER
            ================================================== */}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

                <div className="flex flex-col lg:flex-row lg:items-end gap-4">

                    <div className="flex items-center gap-2 mr-2">

                        <Filter className="w-5 h-5 text-gray-400" />

                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                Transaction Filter
                            </p>

                            <p className="text-xs text-gray-400">
                                Select a date range
                            </p>
                        </div>

                    </div>


                    <div className="flex-1">

                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                            Start Date
                        </label>

                        <input
                            type="date"
                            value={startDate}
                            onChange={e =>
                                setStartDate(e.target.value)
                            }
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>


                    <div className="flex-1">

                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                            End Date
                        </label>

                        <input
                            type="date"
                            value={endDate}
                            onChange={e =>
                                setEndDate(e.target.value)
                            }
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>


                    <button
                        type="button"
                        onClick={fetchOverview}
                        disabled={loading}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Filter className="w-4 h-4" />
                        )}

                        Apply
                    </button>


                    <button
                        type="button"
                        onClick={() => {
                            setStartDate('');
                            setEndDate('');
                        }}
                        className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50"
                    >
                        Clear
                    </button>

                </div>

            </div>


            {/* ==================================================
                RECENT TRANSACTIONS
            ================================================== */}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="p-5 sm:p-6 border-b border-gray-100">

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div>

                            <h2 className="text-lg font-bold text-gray-900">
                                Recent Wallet Transactions
                            </h2>

                            <p className="text-xs text-gray-400 mt-1">
                                Latest money movements in your wallet
                            </p>

                        </div>


                        <div className="flex items-center gap-2">

                            {[
                                { label: 'All', value: 'all' },
                                { label: 'Credits', value: 'credit' }
                            ].map(filter => (

                                <button
                                    key={filter.value}
                                    type="button"
                                    onClick={() =>
                                        setActiveTransaction(
                                            filter.value
                                        )
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                        activeTransaction === filter.value
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                >
                                    {filter.label}
                                </button>

                            ))}

                        </div>

                    </div>

                </div>


                {loading ? (

                    <div className="py-16 flex justify-center">

                        <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />

                    </div>

                ) : filteredTransactions.length > 0 ? (

                    <div className="overflow-x-auto">

                        <table className="min-w-full">

                            <thead>

                                <tr className="bg-gray-50/80 border-b border-gray-100">

                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Transaction
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Date
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Type
                                    </th>

                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                                        Amount
                                    </th>

                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                                        Status
                                    </th>

                                </tr>

                            </thead>


                            <tbody className="divide-y divide-gray-50">

                                {filteredTransactions.map(transaction => (

                                    <tr
                                        key={transaction.id}
                                        className="hover:bg-gray-50/60 transition"
                                    >

                                        <td className="px-6 py-4">

                                            <div className="flex items-center gap-3">

                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                        transaction.type === 'credit'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : 'bg-rose-50 text-rose-600'
                                                    }`}
                                                >
                                                    {transaction.type === 'credit' ? (
                                                        <ArrowDownLeft className="w-4 h-4" />
                                                    ) : (
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    )}
                                                </div>

                                                <div>

                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {transaction.title}
                                                    </p>

                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {transaction.description}
                                                    </p>

                                                </div>

                                            </div>

                                        </td>


                                        <td className="px-6 py-4 whitespace-nowrap">

                                            <p className="text-sm text-gray-700">
                                                {formatDateTime(
                                                    transaction.date
                                                )}
                                            </p>

                                        </td>


                                        <td className="px-6 py-4">

                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                    transaction.type === 'credit'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-rose-50 text-rose-700'
                                                }`}
                                            >
                                                {transaction.type === 'credit'
                                                    ? 'Credit'
                                                    : 'Debit'}
                                            </span>

                                        </td>


                                        <td className="px-6 py-4 text-right whitespace-nowrap">

                                            <span
                                                className={`font-bold text-sm ${
                                                    transaction.type === 'credit'
                                                        ? 'text-emerald-600'
                                                        : 'text-rose-600'
                                                }`}
                                            >
                                                {transaction.type === 'credit'
                                                    ? '+'
                                                    : '-'}
                                                {formatINR(
                                                    transaction.amount
                                                )}
                                            </span>

                                        </td>


                                        <td className="px-6 py-4 text-center">

                                            <StatusBadge
                                                status={
                                                    transaction.status
                                                }
                                            />

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                ) : (

                    <div className="py-16 text-center">

                        <WalletIcon className="w-12 h-12 mx-auto text-gray-200" />

                        <p className="mt-3 text-sm font-semibold text-gray-500">
                            No wallet transactions found
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                            Your wallet activity will appear here
                        </p>

                    </div>

                )}

            </div>


            {/* ==================================================
                QUICK WALLET ACTIONS
            ================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <button
                    type="button"
                    onClick={() =>
                        onNavigate &&
                        onNavigate('Add Funds')
                    }
                    className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-blue-200 hover:shadow-md transition"
                >

                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                        <CreditCard className="w-5 h-5" />
                    </div>

                    <h3 className="font-bold text-gray-900">
                        Add Funds
                    </h3>

                    <p className="text-xs text-gray-400 mt-1">
                        Add money to your BluePay wallet
                    </p>

                </button>


                <button
                    type="button"
                    onClick={() =>
                        onNavigate &&
                        onNavigate('Download Statement')
                    }
                    className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-blue-200 hover:shadow-md transition"
                >

                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                        <FileText className="w-5 h-5" />
                    </div>

                    <h3 className="font-bold text-gray-900">
                        Download Statement
                    </h3>

                    <p className="text-xs text-gray-400 mt-1">
                        View and export wallet transactions
                    </p>

                </button>


                <button
                    type="button"
                    onClick={fetchOverview}
                    className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-blue-200 hover:shadow-md transition"
                >

                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                        <RefreshCw className="w-5 h-5" />
                    </div>

                    <h3 className="font-bold text-gray-900">
                        Refresh Wallet
                    </h3>

                    <p className="text-xs text-gray-400 mt-1">
                        Fetch the latest wallet information
                    </p>

                </button>

            </div>

        </div>

    );
};


/* ============================================================
   ADD FUNDS
============================================================ */

const AddFundsSection = ({ onNavigate }) => {

    const [settings, setSettings] = useState(null);

    // 'bank' = existing manual UTR flow, 'ccavenue' = online payment
    const [paymentMethod, setPaymentMethod] = useState('bank');

    const [amount, setAmount] = useState('');
    const [utrNumber, setUtrNumber] = useState('');
    const [remarks, setRemarks] = useState('');

    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);

    const [loading, setLoading] = useState(false);
    const [ccavenueLoading, setCcavenueLoading] = useState(false);

    const fileRef = useRef(null);


    /* ---------------------------------------------------------
       FETCH SETTINGS
    --------------------------------------------------------- */

    useEffect(() => {

        const fetchSettings = async () => {

            try {

                const response =
                    await apiClient.get('/settings');

                setSettings(response.data);

            } catch (error) {

                if (
                    error?.isCanceled ||
                    error?.message === 'canceled'
                ) {
                    return;
                }

                toast.error('Unable to load bank details');

            }

        };

        fetchSettings();

    }, []);


    /* ---------------------------------------------------------
       FILE
    --------------------------------------------------------- */

    const handleFileChange = (event) => {

        const file =
            event.target.files?.[0];

        if (!file) return;


        if (file.size > 5 * 1024 * 1024) {

            toast.error(
                'File size must be under 5MB'
            );

            return;
        }


        if (!file.type.startsWith('image/')) {

            toast.error(
                'Please upload an image file'
            );

            return;
        }


        setScreenshot(file);

        setScreenshotPreview(
            URL.createObjectURL(file)
        );

    };


    const removeScreenshot = () => {

        setScreenshot(null);
        setScreenshotPreview(null);

        if (fileRef.current) {
            fileRef.current.value = '';
        }

    };


    /* ---------------------------------------------------------
       SUBMIT
    --------------------------------------------------------- */

    const handleSubmit = async (event) => {

        event.preventDefault();

        const numericAmount =
            Number(amount);


        if (!numericAmount || numericAmount <= 0) {

            toast.error(
                'Please enter a valid amount'
            );

            return;
        }


        if (!utrNumber.trim()) {

            toast.error(
                'Please enter UTR / reference number'
            );

            return;
        }


        setLoading(true);


        try {

            const formData =
                new FormData();

            formData.append(
                'amount',
                numericAmount
            );

            formData.append(
                'utr_number',
                utrNumber.trim()
            );

            formData.append(
                'remarks',
                remarks.trim()
            );


            if (screenshot) {

                formData.append(
                    'receipt',
                    screenshot
                );

            }


            await apiClient.post(
                '/funds',
                formData,
                {
                    headers: {
                        'Content-Type':
                            'multipart/form-data',
                        'Idempotency-Key':
                            generateDepositIdempotencyKey()
                    }
                }
            );


            toast.success(
                'Deposit request submitted successfully'
            );


            setAmount('');
            setUtrNumber('');
            setRemarks('');

            removeScreenshot();


            setTimeout(() => {

                if (onNavigate) {
                    onNavigate(
                        'Wallet Overview'
                    );
                }

            }, 1000);


        } catch (error) {

            toast.error(
                error?.response?.data?.msg ||
                'Submission failed'
            );

        } finally {

            setLoading(false);

        }

    };


    /* ---------------------------------------------------------
       CCAVENUE (online payment)

       Money is NEVER credited here. This only asks the backend to
       create an order and hand back an encrypted payload; the browser
       is then form-POSTed straight to CCAvenue's hosted payment page.
       CCAvenue itself calls our backend server-to-server afterwards,
       and only that backend call can result in a wallet credit.
    --------------------------------------------------------- */

    const handleCCAvenuePay = async () => {

        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setCcavenueLoading(true);

        try {

            const { data } = await apiClient.post(
                '/funds/ccavenue/initiate',
                { amount: numericAmount }
            );

            // Build and submit a real (non-AJAX) form so the browser
            // navigates to CCAvenue's hosted payment page.
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.ccavenueUrl;

            const fields = {
                encRequest: data.encRequest,
                access_code: data.accessCode,
            };

            Object.entries(fields).forEach(([name, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();

        } catch (error) {

            toast.error(
                error?.response?.data?.msg ||
                'Unable to start CCAvenue payment'
            );

            setCcavenueLoading(false);

        }

    };


    const quickAmounts = [
        500,
        1000,
        2500,
        5000,
        10000
    ];


    return (

        <div className="w-full pb-12">

            {/* HEADER */}

            <div className="mb-8">

                <div className="flex items-center gap-3">

                    <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
                        <CircleDollarSign className="w-5 h-5 text-white" />
                    </div>

                    <div>

                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Add Funds
                        </h1>

                        <p className="text-sm text-gray-500 mt-1">
                            Add money to your BluePay wallet
                        </p>

                    </div>

                </div>

            </div>


            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">


                {/* ==================================================
                    BANK DETAILS
                ================================================== */}

                <div className="xl:col-span-2 space-y-5">

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                        <div className="flex items-center justify-between mb-5">

                            <h2 className="font-bold text-gray-900 flex items-center gap-2">

                                <Building2 className="w-5 h-5 text-blue-600" />

                                Bank Details

                            </h2>

                            <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">
                                Bank Transfer
                            </span>

                        </div>


                        {settings ? (

                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">

                                <CopyRow
                                    label="Bank Name"
                                    value={
                                        settings.bank_name
                                    }
                                />

                                <CopyRow
                                    label="Account Holder"
                                    value={
                                        settings.holder_name
                                    }
                                />

                                <CopyRow
                                    label="Account Number"
                                    value={
                                        settings.account_number
                                    }
                                />

                                <CopyRow
                                    label="IFSC Code"
                                    value={
                                        settings.ifsc_code
                                    }
                                />

                                <CopyRow
                                    label="Account Type"
                                    value={
                                        settings.account_type
                                    }
                                />

                            </div>

                        ) : (

                            <div className="h-40 flex items-center justify-center">

                                <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />

                            </div>

                        )}


                        {settings?.upi_id && (

                            <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">

                                <CopyRow
                                    label="UPI ID"
                                    value={
                                        settings.upi_id
                                    }
                                />

                            </div>

                        )}

                    </div>


                    {/* HOW IT WORKS */}

                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">

                        <div className="flex gap-3">

                            <Info className="w-5 h-5 text-amber-600 shrink-0" />

                            <div>

                                <p className="font-bold text-amber-800 text-sm">
                                    How it works
                                </p>

                                <ol className="mt-2 text-xs text-amber-700 space-y-1.5 list-decimal list-inside">

                                    <li>
                                        Transfer money to the bank account above
                                    </li>

                                    <li>
                                        Note your UTR / transaction reference
                                    </li>

                                    <li>
                                        Enter the amount and UTR
                                    </li>

                                    <li>
                                        Upload payment proof
                                    </li>

                                    <li>
                                        Wait for verification
                                    </li>

                                </ol>

                            </div>

                        </div>

                    </div>


                    {/* SUPPORT */}

                    {settings && (

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                Support
                            </p>

                            <div className="space-y-3 text-sm">

                                <div className="flex justify-between">

                                    <span className="text-gray-500">
                                        Phone
                                    </span>

                                    <span className="font-semibold text-gray-800">
                                        {settings.mobile_number || '—'}
                                    </span>

                                </div>

                                <div className="flex justify-between">

                                    <span className="text-gray-500">
                                        WhatsApp
                                    </span>

                                    <span className="font-semibold text-gray-800">
                                        {settings.whatsapp_number || '—'}
                                    </span>

                                </div>

                                <div className="flex justify-between">

                                    <span className="text-gray-500">
                                        Email
                                    </span>

                                    <span className="font-semibold text-gray-800">
                                        {settings.support_email || '—'}
                                    </span>

                                </div>

                            </div>

                        </div>

                    )}

                </div>


                {/* ==================================================
                    FORM
                ================================================== */}

                <div className="xl:col-span-3">

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">

                        <h2 className="text-xl font-bold text-gray-900">
                            {paymentMethod === 'bank'
                                ? 'Submit Deposit Request'
                                : 'Add Money Online'}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1 mb-5">
                            {paymentMethod === 'bank'
                                ? 'Submit your transfer details after completing the bank transfer.'
                                : 'Pay instantly using CCAvenue. Your wallet is credited automatically once payment is verified.'}
                        </p>


                        {/* PAYMENT METHOD TABS */}

                        <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl w-fit">

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('bank')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                    paymentMethod === 'bank'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Building2 className="w-4 h-4" />
                                Bank Transfer
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('ccavenue')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                    paymentMethod === 'ccavenue'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Pay Online (CCAvenue)
                            </button>

                        </div>


                        {paymentMethod === 'ccavenue' ? (

                            <div className="space-y-5">

                                {/* AMOUNT */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Amount to Add
                                        <span className="text-red-500"> *</span>
                                    </label>

                                    <div className="relative">

                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">
                                            ₹
                                        </span>

                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
                                        />

                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-3">

                                        {quickAmounts.map(quickAmount => (

                                            <button
                                                key={quickAmount}
                                                type="button"
                                                onClick={() => setAmount(String(quickAmount))}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                                                    amount === String(quickAmount)
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                                }`}
                                            >
                                                ₹{quickAmount.toLocaleString('en-IN')}
                                            </button>

                                        ))}

                                    </div>

                                </div>


                                <button
                                    type="button"
                                    disabled={ccavenueLoading}
                                    onClick={handleCCAvenuePay}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                >

                                    {ccavenueLoading ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Redirecting to CCAvenue...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-5 h-5" />
                                            Pay Securely via CCAvenue
                                        </>
                                    )}

                                </button>

                                <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5" />
                                    You will be redirected to CCAvenue's secure payment page.
                                </p>

                            </div>

                        ) : (

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >


                            {/* AMOUNT */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">

                                    Amount Deposited

                                    <span className="text-red-500">
                                        {' '}*
                                    </span>

                                </label>

                                <div className="relative">

                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">
                                        ₹
                                    </span>

                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        required
                                        value={amount}
                                        onChange={e =>
                                            setAmount(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter amount"
                                        className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
                                    />

                                </div>


                                <div className="flex flex-wrap gap-2 mt-3">

                                    {quickAmounts.map(
                                        quickAmount => (

                                            <button
                                                key={quickAmount}
                                                type="button"
                                                onClick={() =>
                                                    setAmount(
                                                        String(
                                                            quickAmount
                                                        )
                                                    )
                                                }
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                                                    amount ===
                                                    String(
                                                        quickAmount
                                                    )
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                                }`}
                                            >
                                                ₹
                                                {quickAmount.toLocaleString(
                                                    'en-IN'
                                                )}
                                            </button>

                                        )
                                    )}

                                </div>

                            </div>


                            {/* UTR */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">

                                    UTR / Transaction Reference ID

                                    <span className="text-red-500">
                                        {' '}*
                                    </span>

                                </label>

                                <div className="relative">

                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                                    <input
                                        type="text"
                                        required
                                        value={utrNumber}
                                        onChange={e =>
                                            setUtrNumber(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter UTR / reference number"
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    />

                                </div>

                            </div>


                            {/* SCREENSHOT */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">

                                    Payment Screenshot

                                    <span className="text-gray-400 font-normal">
                                        {' '}(Recommended)
                                    </span>

                                </label>


                                {!screenshotPreview ? (

                                    <div
                                        onClick={() =>
                                            fileRef.current?.click()
                                        }
                                        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
                                    >

                                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />

                                        <p className="text-sm font-medium text-gray-500">
                                            Click to upload payment screenshot
                                        </p>

                                        <p className="text-xs text-gray-400 mt-1">
                                            PNG, JPG, WEBP up to 5MB
                                        </p>

                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={
                                                handleFileChange
                                            }
                                            className="hidden"
                                        />

                                    </div>

                                ) : (

                                    <div className="relative overflow-hidden rounded-xl border border-gray-200">

                                        <img
                                            src={
                                                screenshotPreview
                                            }
                                            alt="Payment proof"
                                            className="w-full max-h-52 object-cover"
                                        />

                                        <button
                                            type="button"
                                            onClick={
                                                removeScreenshot
                                            }
                                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        <div className="bg-black/60 text-white px-3 py-2 text-xs flex items-center gap-2">

                                            <ImageIcon className="w-3.5 h-3.5" />

                                            {screenshot?.name}

                                        </div>

                                    </div>

                                )}

                            </div>


                            {/* REMARKS */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Remarks
                                    <span className="text-gray-400 font-normal">
                                        {' '}(Optional)
                                    </span>
                                </label>

                                <textarea
                                    rows={3}
                                    value={remarks}
                                    onChange={e =>
                                        setRemarks(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Add any additional information..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                />

                            </div>


                            {/* SUBMIT */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                            >

                                {loading ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Submit Deposit Request
                                    </>
                                )}

                            </button>


                            <p className="text-xs text-gray-400 text-center">
                                Your request will remain pending until it is verified.
                            </p>

                        </form>

                        )}

                    </div>

                </div>

            </div>

        </div>

    );
};


/* ============================================================
   TRANSACTIONS (wallet CREDIT-only ledger view)

   Reuses the existing merchant-scoped /funds/wallet-overview endpoint
   (already used by WalletOverviewSection above) instead of adding a new
   API - that endpoint already returns the real LedgerTransaction records
   for the logged-in merchant (via req.user.id on the backend), so no
   other merchant's data can appear here and no new backend logic is
   needed. Only CREDIT entries are kept; payout DEBITs stay exclusively
   in the Payouts module.
============================================================ */

const TRANSACTION_STATUS_OPTIONS = ['all', 'success', 'pending', 'processing', 'failed', 'reversed'];

const TransactionSection = () => {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Date range is sent to the backend (same query params WalletOverviewSection
    // already uses on this endpoint); search/status are applied client-side on
    // the CREDIT rows already returned, same pattern as Payouts.jsx's
    // HistorySection search box.
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchTransactions = useCallback(async () => {

        setLoading(true);
        setError('');

        try {

            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            const query = params.toString();

            const response = await apiClient.get(`/funds/wallet-overview${query ? `?${query}` : ''}`);
            setData(response.data);

        } catch (err) {

            if (err?.isCanceled || err?.message === 'canceled') {
                return;
            }

            setError(err?.response?.data?.msg || 'Failed to load transactions');

        } finally {

            setLoading(false);

        }

    }, [startDate, endDate]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const hasActiveFilters = Boolean(startDate || endDate || search.trim() || statusFilter !== 'all');

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearch('');
        setStatusFilter('all');
    };

    const creditTransactions = (data?.transactions || [])
        .filter((item) => String(item.type).toUpperCase() === 'CREDIT')
        .filter((item) => statusFilter === 'all' || String(item.status).toLowerCase() === statusFilter)
        .filter((item) => {
            const term = search.trim().toLowerCase();
            if (!term) return true;
            const utr = item?.metadata?.utr || item?.metadata?.bankRefNo || '';
            return [item.transactionId, item.referenceId, item.description, utr]
                .some((field) => String(field || '').toLowerCase().includes(term));
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="w-full space-y-6">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <FileText className="w-5 h-5 text-white" />
                    </div>

                    <div>

                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Transaction
                        </h1>

                        <p className="text-sm text-gray-500 mt-1">
                            Wallet funding/credit history for your account
                        </p>

                    </div>

                </div>

                <button
                    type="button"
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-blue-300 hover:text-blue-600 transition text-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>

            </div>

            {/* ==================================================
                FILTERS
            ================================================== */}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">

                <div className="flex flex-wrap items-end gap-3">

                    <div className="flex-1 min-w-[220px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Transaction ID, reference, UTR, remarks..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 capitalize"
                        >
                            {TRANSACTION_STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option} className="capitalize">
                                    {option === 'all' ? 'All Statuses' : option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">From</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-1 py-2"
                        >
                            Clear filters
                        </button>
                    )}

                </div>

            </div>

            {/* ==================================================
                TRANSACTION LIST
            ================================================== */}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="p-5 sm:p-6 border-b border-gray-100">

                    <h2 className="text-lg font-bold text-gray-900">
                        Wallet Credits
                    </h2>

                    <p className="text-xs text-gray-400 mt-1">
                        Every credit posted to your wallet, most recent first
                    </p>

                </div>

                {loading ? (

                    <div className="py-16 flex justify-center">
                        <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
                    </div>

                ) : error ? (

                    <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-sm text-gray-600">{error}</p>
                        <button
                            type="button"
                            onClick={fetchTransactions}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Try again
                        </button>
                    </div>

                ) : creditTransactions.length > 0 ? (

                    <div className="overflow-x-auto">

                        <table className="min-w-full">

                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Transaction ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date &amp; Time</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance After</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50">
                                {creditTransactions.map((item) => {
                                    const utr = item?.metadata?.utr || item?.metadata?.bankRefNo || '';
                                    return (
                                        <tr key={item._id} className="hover:bg-gray-50/60 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
                                                        <ArrowDownLeft className="w-4 h-4" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{item.transactionId || '—'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <p>{item.referenceId || '—'}</p>
                                                {utr && <p className="text-xs text-gray-400 mt-0.5">UTR: {utr}</p>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {item.referenceType || item.category || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                {item.description || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                {formatDateTime(item.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-600 whitespace-nowrap">
                                                +{formatINR(item.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-600 whitespace-nowrap">
                                                {formatINR(item.balanceAfter)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={item.status} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                        </table>

                    </div>

                ) : (

                    <div className="py-16 flex flex-col items-center gap-2 text-center px-6">
                        <FileText className="w-8 h-8 text-gray-300" />
                        <p className="text-sm text-gray-500">
                            {hasActiveFilters ? 'No transactions match the current filters.' : 'No wallet credits found yet.'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {hasActiveFilters ? 'Try adjusting or clearing your filters.' : 'Funds you add to your wallet will appear here.'}
                        </p>
                    </div>

                )}

            </div>

        </div>

    );
};


/* ============================================================
   STATEMENT
============================================================ */

const StatementStatusBadge = ({ status }) => {

    return (
        <StatusBadge status={status} />
    );
};


const downloadCSV = (rows, filename) => {

    if (!rows.length) {

        toast.error(
            'No data to export'
        );

        return;
    }


    const headers =
        Object.keys(rows[0]);


    const csv = [

        headers.join(','),

        ...rows.map(row =>
            headers
                .map(
                    header =>
                        `"${String(
                            row[header] ?? ''
                        ).replace(
                            /"/g,
                            '""'
                        )}"`
                )
                .join(',')
        )

    ].join('\n');


    const blob = new Blob(
        [csv],
        {
            type: 'text/csv'
        }
    );


    const url =
        URL.createObjectURL(blob);


    const anchor =
        document.createElement('a');

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);

};


const DownloadStatementSection = () => {

    const today =
        new Date()
            .toISOString()
            .split('T')[0];


    const firstOfMonth =
        new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
        )
            .toISOString()
            .split('T')[0];


    const [startDate, setStartDate] =
        useState(firstOfMonth);

    const [endDate, setEndDate] =
        useState(today);

    const [statusFilter, setStatusFilter] =
        useState('all');

    const [searchTerm, setSearchTerm] =
        useState('');

    const [data, setData] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [searched, setSearched] =
        useState(false);


    /* ---------------------------------------------------------
       FETCH
    --------------------------------------------------------- */

    const fetchData = async () => {

        if (!startDate || !endDate) {

            toast.error(
                'Please select both dates'
            );

            return;
        }


        if (
            new Date(startDate) >
            new Date(endDate)
        ) {

            toast.error(
                'Start date cannot be after end date'
            );

            return;
        }


        setLoading(true);


        try {

            const response =
                await apiClient.get(
                    `/funds/wallet-overview?startDate=${startDate}&endDate=${endDate}`
                );


            setData(
                response.data
            );

            setSearched(true);


        } catch (error) {

            if (
                error?.isCanceled ||
                error?.message === 'canceled'
            ) {
                return;
            }

            toast.error(
                'Failed to fetch statement'
            );

        } finally {

            setLoading(false);

        }

    };


    /* ---------------------------------------------------------
       FILTER
    --------------------------------------------------------- */

    const filteredRequests =
        (data?.fundRequests || [])
            .filter(request => {

                const statusMatch =
                    statusFilter === 'all' ||
                    request.status ===
                    statusFilter;


                const search =
                    searchTerm
                        .toLowerCase()
                        .trim();


                const searchMatch =
                    !search ||
                    request.utr_number
                        ?.toLowerCase()
                        .includes(search) ||
                    request.remarks
                        ?.toLowerCase()
                        .includes(search);


                return (
                    statusMatch &&
                    searchMatch
                );

            });


    /* ---------------------------------------------------------
       EXPORT
    --------------------------------------------------------- */

    const handleCSV = () => {

        const rows =
            filteredRequests.map(
                request => ({

                    Date:
                        formatDateTime(
                            request.createdAt
                        ),

                    Amount:
                        request.amount,

                    'UTR / Reference':
                        request.utr_number ||
                        '',

                    Status:
                        request.status,

                    Remarks:
                        request.remarks ||
                        '',

                    'Admin Remark':
                        request.adminRemarks ||
                        ''

                })
            );


        downloadCSV(
            rows,
            `BluePay_Statement_${startDate}_to_${endDate}.csv`
        );

    };


    const handlePDF = () => {

        window.print();

    };


    /* ---------------------------------------------------------
       PRESETS
    --------------------------------------------------------- */

    const presets = [

        {
            label: 'This Week',

            action: () => {

                const date =
                    new Date();

                date.setDate(
                    date.getDate() - 6
                );

                setStartDate(
                    date
                        .toISOString()
                        .split('T')[0]
                );

                setEndDate(today);

            }
        },

        {
            label: 'This Month',

            action: () => {

                setStartDate(
                    firstOfMonth
                );

                setEndDate(today);

            }
        },

        {
            label: 'Last Month',

            action: () => {

                const now =
                    new Date();

                const first =
                    new Date(
                        now.getFullYear(),
                        now.getMonth() - 1,
                        1
                    );

                const last =
                    new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        0
                    );

                setStartDate(
                    first
                        .toISOString()
                        .split('T')[0]
                );

                setEndDate(
                    last
                        .toISOString()
                        .split('T')[0]
                );

            }
        },

        {
            label: 'This Year',

            action: () => {

                setStartDate(
                    `${new Date().getFullYear()}-01-01`
                );

                setEndDate(today);

            }
        }

    ];


    const approvedAmount =
        filteredRequests
            .filter(
                item =>
                    item.status ===
                    'approved'
            )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.amount || 0
                    ),
                0
            );


    return (

        <div className="w-full pb-12 print:p-4">


            {/* HEADER */}

            <div className="flex items-center justify-between mb-7 print:hidden">

                <div>

                    <div className="flex items-center gap-3">

                        <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
                            <FileDown className="w-5 h-5 text-white" />
                        </div>

                        <div>

                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                Download Statement
                            </h1>

                            <p className="text-sm text-gray-500 mt-1">
                                View and export your wallet statement
                            </p>

                        </div>

                    </div>

                </div>

            </div>


            {/* FILTER */}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 print:hidden">

                <div className="flex flex-wrap gap-2 mb-5">

                    {presets.map(
                        preset => (

                            <button
                                key={
                                    preset.label
                                }
                                type="button"
                                onClick={
                                    preset.action
                                }
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-600 rounded-full hover:border-blue-400 hover:text-blue-600"
                            >
                                {
                                    preset.label
                                }
                            </button>

                        )
                    )}

                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div>

                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            From Date
                        </label>

                        <input
                            type="date"
                            value={
                                startDate
                            }
                            max={
                                endDate
                            }
                            onChange={e =>
                                setStartDate(
                                    e.target.value
                                )
                            }
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>


                    <div>

                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            To Date
                        </label>

                        <input
                            type="date"
                            value={
                                endDate
                            }
                            min={
                                startDate
                            }
                            max={
                                today
                            }
                            onChange={e =>
                                setEndDate(
                                    e.target.value
                                )
                            }
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>


                    <div>

                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Status
                        </label>

                        <div className="relative">

                            <select
                                value={
                                    statusFilter
                                }
                                onChange={e =>
                                    setStatusFilter(
                                        e.target.value
                                    )
                                }
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >

                                <option value="all">
                                    All Statuses
                                </option>

                                <option value="approved">
                                    Approved
                                </option>

                                <option value="pending">
                                    Pending
                                </option>

                                <option value="rejected">
                                    Rejected
                                </option>

                            </select>

                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                        </div>

                    </div>


                    <div className="flex items-end">

                        <button
                            type="button"
                            onClick={
                                fetchData
                            }
                            disabled={
                                loading
                            }
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                        >

                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}

                            {loading
                                ? 'Fetching...'
                                : 'Fetch Records'}

                        </button>

                    </div>

                </div>

            </div>


            {/* RESULTS */}

            {searched && data && (

                <>

                    {/* SUMMARY */}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

                            <p className="text-xs text-gray-500">
                                Total Requests
                            </p>

                            <p className="text-xl font-bold mt-1">
                                {
                                    filteredRequests.length
                                }
                            </p>

                        </div>


                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

                            <p className="text-xs text-gray-500">
                                Approved
                            </p>

                            <p className="text-xl font-bold text-emerald-600 mt-1">
                                {
                                    filteredRequests.filter(
                                        r =>
                                            r.status ===
                                            'approved'
                                    ).length
                                }
                            </p>

                        </div>


                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

                            <p className="text-xs text-gray-500">
                                Pending
                            </p>

                            <p className="text-xl font-bold text-amber-600 mt-1">
                                {
                                    filteredRequests.filter(
                                        r =>
                                            r.status ===
                                            'pending'
                                    ).length
                                }
                            </p>

                        </div>


                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

                            <p className="text-xs text-gray-500">
                                Total Credited
                            </p>

                            <p className="text-xl font-bold text-emerald-600 mt-1">
                                {
                                    formatINR(
                                        approvedAmount
                                    )
                                }
                            </p>

                        </div>

                    </div>


                    {/* TABLE */}

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                            <div>

                                <h2 className="font-bold text-gray-900">
                                    Wallet Statement
                                </h2>

                                <p className="text-xs text-gray-400 mt-1">
                                    {startDate} — {endDate}
                                </p>

                            </div>


                            <div className="flex gap-2">

                                <div className="relative">

                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />

                                    <input
                                        type="text"
                                        value={
                                            searchTerm
                                        }
                                        onChange={e =>
                                            setSearchTerm(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Search UTR..."
                                        className="pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                                    />

                                </div>


                                <button
                                    type="button"
                                    onClick={
                                        handleCSV
                                    }
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                                >

                                    <Download className="w-3.5 h-3.5" />

                                    CSV

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handlePDF
                                    }
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-gray-900"
                                >

                                    <FileText className="w-3.5 h-3.5" />

                                    PDF

                                </button>

                            </div>

                        </div>


                        {filteredRequests.length > 0 ? (

                            <div className="overflow-x-auto">

                                <table className="min-w-full">

                                    <thead>

                                        <tr className="bg-gray-50/80">

                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                                Date
                                            </th>

                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                                Amount
                                            </th>

                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                                UTR / Reference
                                            </th>

                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                                Remarks
                                            </th>

                                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                                                Status
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody className="divide-y divide-gray-50">

                                        {filteredRequests.map(
                                            request => (

                                                <tr
                                                    key={
                                                        request._id
                                                    }
                                                    className="hover:bg-gray-50"
                                                >

                                                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">

                                                        {
                                                            formatDateTime(
                                                                request.createdAt
                                                            )
                                                        }

                                                    </td>


                                                    <td className="px-5 py-4">

                                                        <span className={`font-bold ${
                                                            request.status === 'approved'
                                                                ? 'text-emerald-600'
                                                                : request.status === 'rejected'
                                                                    ? 'text-red-500'
                                                                    : 'text-gray-800'
                                                        }`}>

                                                            {request.status ===
                                                            'approved'
                                                                ? '+'
                                                                : ''}

                                                            {
                                                                formatINR(
                                                                    request.amount
                                                                )
                                                            }

                                                        </span>

                                                    </td>


                                                    <td className="px-5 py-4">

                                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">

                                                            {
                                                                request.utr_number ||
                                                                '—'
                                                            }

                                                        </span>

                                                    </td>


                                                    <td className="px-5 py-4 text-xs text-gray-500">

                                                        {
                                                            request.remarks ||
                                                            '—'
                                                        }

                                                    </td>


                                                    <td className="px-5 py-4 text-center">

                                                        <StatementStatusBadge
                                                            status={
                                                                request.status
                                                            }
                                                        />

                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        ) : (

                            <div className="py-20 text-center">

                                <FileDown className="w-12 h-12 mx-auto text-gray-200" />

                                <p className="text-sm font-semibold text-gray-500 mt-3">
                                    No records found
                                </p>

                                <p className="text-xs text-gray-400 mt-1">
                                    Try another date range or filter
                                </p>

                            </div>

                        )}

                    </div>

                </>

            )}


            {!searched && (

                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">

                    <FileDown className="w-14 h-14 mx-auto text-gray-200" />

                    <p className="text-lg font-semibold text-gray-500 mt-4">
                        Select a date range
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                        Fetch records to view your statement
                    </p>

                </div>

            )}

        </div>

    );
};


/* ============================================================
   MAIN WALLET MODULE
============================================================ */

const TAB_ITEMS = [
    {
        label: 'Overview',
        view: 'Wallet Overview'
    },
    {
        label: 'Add Funds',
        view: 'Add Funds'
    },
    {
        label: 'Transaction',
        view: 'Transaction'
    },
    {
        label: 'Statement',
        view: 'Download Statement'
    }
];


const Wallet = ({
    view,
    onNavigate
}) => {

    const handleTabClick = (
        targetView
    ) => {

        if (onNavigate) {
            onNavigate(
                targetView
            );
        }

    };


    let content;


    if (
        view ===
        'Add Funds'
    ) {

        content = (
            <AddFundsSection
                onNavigate={
                    onNavigate
                }
            />
        );

    } else if (
        view ===
        'Transaction'
    ) {

        content = (
            <TransactionSection />
        );

    } else if (
        view ===
        'Download Statement'
    ) {

        content = (
            <DownloadStatementSection />
        );

    } else {

        content = (
            <WalletOverviewSection
                onNavigate={
                    onNavigate
                }
            />
        );

    }


    return (

        <div className="w-full">

            {/* WALLET TABS */}

            <div className="flex flex-wrap gap-2 mb-6 print:hidden">

                {TAB_ITEMS.map(tab => (

                    <button
                        key={
                            tab.view
                        }
                        type="button"
                        onClick={() =>
                            handleTabClick(
                                tab.view
                            )
                        }
                        className={`px-4 py-2 text-sm font-semibold rounded-full border transition ${
                            view === tab.view ||
                            (
                                tab.view ===
                                'Wallet Overview' &&
                                !TAB_ITEMS.some(
                                    item =>
                                        item.view ===
                                        view
                                )
                            )
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                        }`}
                    >

                        {tab.label}

                    </button>

                ))}

            </div>


            {content}

        </div>

    );

};


export default Wallet;