import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    CreditCard, Plus, Upload, CalendarClock, History, XCircle,
    Search, ArrowUpRight, CheckCircle, RefreshCw, Clock, Trash2, Download,
    AlertTriangle, Wallet as WalletIcon, ShieldCheck, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const StatusBadge = ({ status }) => {
    const map = {
        success: { cls: 'bg-green-50 text-green-700', icon: CheckCircle, label: 'Success' },
        failed: { cls: 'bg-red-50 text-red-700', icon: XCircle, label: 'Failed' },
        processing: { cls: 'bg-blue-50 text-blue-700', icon: RefreshCw, label: 'Processing' },
        pending: { cls: 'bg-orange-50 text-orange-700', icon: Clock, label: 'Pending' },
        unknown: { cls: 'bg-amber-50 text-amber-700', icon: AlertTriangle, label: 'Unknown' },
    };
    const cfg = map[status] || map.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
            <Icon className="w-3.5 h-3.5" /> {cfg.label}
        </span>
    );
};

// ------------------------------------------------------------
// Create Payout Section
// ------------------------------------------------------------

const EMPTY_FORM = {
    beneficiary: '',
    account: '',
    confirmAccount: '',
    ifsc: '',
    bankName: '',
    amount: '',
    remarks: '',
};

// One idempotency key per distinct submission. Re-submitting the exact same
// form values (double-click, retry after a transient error) reuses the same
// key so the backend's idempotency middleware treats it as the same request
// instead of creating a second payout; changing any field is a genuinely
// new request and gets a fresh key.
const generateIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `payout-${crypto.randomUUID()}`;
    }
    return `payout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const generateBulkIdempotencyKey = async (selectedFile) => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', await selectedFile.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
        return `bulk-${hash}`;
    }
    return generateIdempotencyKey();
};

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^\d{9,18}$/;

const validatePayoutForm = (form, availableBalance) => {
    const errors = {};

    const beneficiary = form.beneficiary.trim();
    const account = form.account.trim();
    const confirmAccount = form.confirmAccount.trim();
    const ifsc = form.ifsc.trim().toUpperCase();

    if (!beneficiary) {
        errors.beneficiary = 'Beneficiary name is required';
    }

    if (!account) {
        errors.account = 'Account number is required';
    } else if (!ACCOUNT_PATTERN.test(account)) {
        errors.account = 'Enter a valid account number';
    }

    if (!confirmAccount) {
        errors.confirmAccount = 'Please confirm the account number';
    } else if (account && confirmAccount !== account) {
        errors.confirmAccount = 'Account numbers do not match';
    }

    if (!ifsc) {
        errors.ifsc = 'IFSC code is required';
    } else if (!IFSC_PATTERN.test(ifsc)) {
        errors.ifsc = 'Enter a valid IFSC code (e.g. HDFC0001234)';
    }

    const rawAmount = String(form.amount).trim();
    const amount = Number(rawAmount);

    if (!rawAmount) {
        errors.amount = 'Amount is required';
    } else if (!Number.isFinite(amount)) {
        errors.amount = 'Enter a valid amount';
    } else if (amount <= 0) {
        errors.amount = 'Amount must be greater than 0';
    } else if (availableBalance !== null && amount > availableBalance) {
        errors.amount = 'Amount exceeds available balance';
    }

    return errors;
};

const CreatePayoutSection = ({ onNavigate }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const [wallet, setWallet] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true);

    // Tracks which exact payload the current idempotency key was minted
    // for, so editing the form after a failed attempt gets a new key
    // while an unmodified retry safely reuses the old one.
    const idempotencyKeyRef = useRef(null);
    const lastPayloadSignatureRef = useRef(null);

    const fetchWallet = async () => {
        try {
            const { data } = await apiClient.get('/funds/wallet-overview');
            setWallet(data?.wallet || null);
        } catch {
            // Balance display degrades gracefully; amount-vs-balance validation
            // is skipped client-side but the backend still enforces it.
        } finally {
            setWalletLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const setField = (field) => (e) => {
        const value = e.target.value;
        setForm((p) => ({ ...p, [field]: field === 'ifsc' ? value.toUpperCase() : value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const availableBalance = wallet ? Number(wallet.availableBalance || 0) : null;
    const enteredAmount = Number(form.amount) || 0;
    const remainingBalance = availableBalance !== null ? availableBalance - enteredAmount : null;

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setErrors({});
        idempotencyKeyRef.current = null;
        lastPayloadSignatureRef.current = null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (submitting) return; // guards against double-click / accidental double submission

        const validationErrors = validatePayoutForm(form, availableBalance);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please fix the errors in the form');
            return;
        }

        const payload = {
            amount: Number(form.amount),
            beneficiary_name: form.beneficiary.trim(),
            account_number: form.account.trim(),
            ifsc_code: form.ifsc.trim().toUpperCase(),
            bank_name: form.bankName.trim(),
            remarks: form.remarks.trim(),
        };

        const payloadSignature = JSON.stringify(payload);
        if (!idempotencyKeyRef.current || lastPayloadSignatureRef.current !== payloadSignature) {
            idempotencyKeyRef.current = generateIdempotencyKey();
            lastPayloadSignatureRef.current = payloadSignature;
        }

        setSubmitting(true);

        try {
            const { data } = await apiClient.post('/payouts', payload, {
                headers: { 'Idempotency-Key': idempotencyKeyRef.current },
            });

            setResult(data.payout);

            if (data.wallet) {
                setWallet(data.wallet);
            } else {
                fetchWallet();
            }

            if (data.payout?.status === 'failed') {
                toast.error(data.msg || 'Payout failed');
            } else {
                toast.success(data.msg || 'Payout created');
            }

            resetForm();
        } catch (error) {
            const status = error?.response?.status;
            const serverMsg = error?.response?.data?.msg;

            if (status === 400) {
                toast.error(serverMsg || 'Invalid payout request');
            } else if (status === 401) {
                toast.error('Please log in again to continue');
            } else if (status === 403) {
                toast.error('You are not authorized to perform this action');
            } else if (status === 409) {
                toast.error(serverMsg || 'This payout request is already being processed');
            } else if (status === 422) {
                toast.error(serverMsg || 'Invalid payout data');
            } else if (status >= 500) {
                toast.error('Something went wrong on our end. Please try again shortly');
            } else if (!error?.response) {
                toast.error('Network error. Please check your connection and try again');
            } else {
                toast.error(serverMsg || 'Failed to create payout');
            }
            // Same idempotency key is deliberately kept for this payload so a
            // retry (same values, click Send Payout again) is treated as the
            // same request by the backend instead of creating a duplicate.
        } finally {
            setSubmitting(false);
        }
    };

    if (result) {
        const payoutId = result._id ? String(result._id).slice(-6).toUpperCase() : '—';
        const statusLabel = {
            success: 'Success',
            processing: 'Processing',
            pending: 'Processing',
            failed: 'Failed',
            unknown: 'Unknown (pending confirmation)',
        }[result.status] || result.status;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.status === 'failed' ? 'bg-red-50' : 'bg-green-50'
                            }`}>
                            {result.status === 'failed' ? (
                                <XCircle className="w-6 h-6 text-red-600" />
                            ) : (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {result.status === 'failed' ? 'Payout Failed' : 'Payout Created'}
                            </h2>
                            <p className="text-sm text-gray-500">Reference ID: BP{payoutId}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Payout ID</span>
                            <span className="font-mono font-semibold text-gray-900">BP{payoutId}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Amount</span>
                            <span className="font-bold text-gray-900">{formatCurrency(result.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Beneficiary</span>
                            <span className="font-semibold text-gray-900">{result.beneficiary_name}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Status</span>
                            <StatusBadge status={result.status} />
                        </div>
                    </div>

                    {(result.status === 'processing' || result.status === 'unknown') && (
                        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                            Your payout has been accepted and funds are reserved. {statusLabel === 'Unknown (pending confirmation)'
                                ? "We couldn't get an immediate confirmation from the bank — the amount stays reserved until it's confirmed."
                                : "We'll update the status once the bank confirms it."}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                        <button
                            onClick={() => setResult(null)}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
                        >
                            <Plus className="w-4 h-4" /> Create Another Payout
                        </button>
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate('History')}
                                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
                            >
                                View Payout History <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <WalletSummaryCard
                    walletLoading={walletLoading}
                    availableBalance={availableBalance}
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">New Payout</h2>
                <p className="text-sm text-gray-500 mb-6">Send funds directly to a beneficiary's bank account.</p>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Beneficiary Name *</label>
                        <input
                            value={form.beneficiary}
                            onChange={setField('beneficiary')}
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.beneficiary ? 'border-red-300' : 'border-gray-200'
                                }`}
                            placeholder="e.g. Rahul Sharma"
                        />
                        {errors.beneficiary && <p className="text-xs text-red-600 mt-1.5">{errors.beneficiary}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number *</label>
                            <input
                                value={form.account}
                                onChange={setField('account')}
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.account ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="XXXXXXXXXXXX"
                            />
                            {errors.account && <p className="text-xs text-red-600 mt-1.5">{errors.account}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Account Number *</label>
                            <input
                                value={form.confirmAccount}
                                onChange={setField('confirmAccount')}
                                onPaste={(e) => e.preventDefault()}
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmAccount ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="Re-enter account number"
                            />
                            {errors.confirmAccount && <p className="text-xs text-red-600 mt-1.5">{errors.confirmAccount}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">IFSC Code *</label>
                            <input
                                value={form.ifsc}
                                onChange={setField('ifsc')}
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ifsc ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                placeholder="HDFC0001234"
                            />
                            {errors.ifsc && <p className="text-xs text-red-600 mt-1.5">{errors.ifsc}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                            <input
                                value={form.bankName}
                                onChange={setField('bankName')}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. HDFC Bank"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹) *</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.amount}
                            onChange={setField('amount')}
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount ? 'border-red-300' : 'border-gray-200'
                                }`}
                            placeholder="0.00"
                        />
                        {errors.amount && <p className="text-xs text-red-600 mt-1.5">{errors.amount}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks / Reference</label>
                        <textarea
                            rows={2}
                            value={form.remarks}
                            onChange={setField('remarks')}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional note"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-500/30"
                    >
                        {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                        {submitting ? 'Processing...' : 'Send Payout'}
                    </button>
                </form>
            </div>

            <div className="space-y-6">
                <WalletSummaryCard
                    walletLoading={walletLoading}
                    availableBalance={availableBalance}
                    enteredAmount={enteredAmount}
                    remainingBalance={remainingBalance}
                    isOverLimit={remainingBalance !== null && remainingBalance < 0}
                />

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">Quick Tips</h3>
                    <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside leading-relaxed">
                        <li>Double-check IFSC and account number before submitting.</li>
                        <li>Payouts above ₹1,00,000 may require additional approval.</li>
                        <li>Use Bulk Payout to send to multiple beneficiaries at once.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// Wallet Summary Card (Create Payout)
// ------------------------------------------------------------

const WalletSummaryCard = ({ walletLoading, availableBalance, enteredAmount = 0, remainingBalance = null, isOverLimit = false }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-blue-600" /> Wallet Summary
        </h3>

        {walletLoading ? (
            <p className="text-xs text-gray-400">Loading balance...</p>
        ) : availableBalance === null ? (
            <p className="text-xs text-gray-400">Balance unavailable right now.</p>
        ) : (
            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Available Balance</span>
                    <span className="font-bold text-gray-900">{formatCurrency(availableBalance)}</span>
                </div>
                {remainingBalance !== null && (
                    <>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Payout Amount</span>
                            <span className="font-semibold text-blue-600">{formatCurrency(enteredAmount)}</span>
                        </div>
                        <div className="h-px bg-gray-100" />
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Remaining Balance</span>
                            <span className={`font-bold ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(remainingBalance)}
                            </span>
                        </div>
                        {isOverLimit && (
                            <p className="text-xs text-red-600 flex items-center gap-1.5 mt-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Amount exceeds available balance
                            </p>
                        )}
                    </>
                )}
            </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Balance is verified by the server before every payout.
        </div>
    </div>
);

// ------------------------------------------------------------
// Bulk Payout Section
// ------------------------------------------------------------

const BulkPayoutSection = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [submittedBatch, setSubmittedBatch] = useState(null);
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const loadBatches = async () => {
        try {
            const response = await apiClient.get('/payouts/bulk', { params: { limit: 20 } });
            setBatches(response.data.batches || []);
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Unable to load bulk payout history');
        }
    };

    useEffect(() => { loadBatches(); }, []);

    useEffect(() => {
        if (!submittedBatch?._id || !['processing', 'partial'].includes(submittedBatch.status)) return undefined;
        const timer = window.setInterval(async () => {
            try {
                const response = await apiClient.get(`/payouts/bulk/${submittedBatch._id}`);
                setSubmittedBatch(response.data.batch);
                if (!['processing', 'partial'].includes(response.data.batch.status)) {
                    window.clearInterval(timer);
                    loadBatches();
                }
            } catch { /* The next refresh can recover from a transient network error. */ }
        }, 3000);
        return () => window.clearInterval(timer);
    }, [submittedBatch?._id, submittedBatch?.status]);

    const validateFile = async () => {
        if (!file) { toast.error('Choose a CSV file first'); return; }
        const body = new FormData();
        body.append('file', file);
        setLoading(true);
        try {
            const response = await apiClient.post('/payouts/bulk/validate', body, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult(response.data);
            toast.success('CSV validated');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'CSV validation failed');
        } finally { setLoading(false); }
    };

    const downloadTemplate = async () => {
        try {
            const response = await apiClient.get('/payouts/bulk/template', { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a'); link.href = url; link.download = 'bulk_payout_template.csv'; link.click(); URL.revokeObjectURL(url);
        } catch (error) { toast.error(error.response?.data?.msg || 'Unable to download template'); }
    };

    const submitBulk = async () => {
        if (!file || !result?.valid?.length) return;
        const confirmed = window.confirm(`Submit ${result.valid.length} payouts totaling ${formatCurrency(result.totalAmount)}? Funds will be reserved and processing will continue in the background.`);
        if (!confirmed) return;

        const body = new FormData();
        body.append('file', file);
        setLoading(true);
        try {
            const idempotencyKey = await generateBulkIdempotencyKey(file);
            const response = await apiClient.post('/payouts/bulk', body, {
                headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': idempotencyKey },
            });
            setSubmittedBatch(response.data.batch);
            await loadBatches();
            toast.success('Bulk payout submitted');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Bulk payout submission failed');
        } finally { setLoading(false); }
    };

    const showBatch = async (batchId) => {
        try {
            const response = await apiClient.get(`/payouts/bulk/${batchId}`);
            setSelectedBatch(response.data.batch);
        } catch (error) { toast.error(error.response?.data?.msg || 'Unable to load batch'); }
    };

    return (
    <>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Bulk Payout</h2>
        <p className="text-sm text-gray-500 mb-6">Upload a CSV file to process multiple payouts in one go.</p>

        <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            onClick={() => document.getElementById('bulk-payout-file')?.click()}
        >
            <Upload className="w-9 h-9 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Click to upload CSV file</p>
            <p className="text-xs text-gray-400 mt-1">Format: beneficiary_name, account_number, ifsc, amount</p>
            <input id="bulk-payout-file" type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </div>

        {file && <p className="mt-3 text-sm text-gray-600">Selected: <strong>{file.name}</strong></p>}
        <button type="button" onClick={validateFile} disabled={loading || !file} className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Validating...' : 'Validate CSV'}</button>
        {result && <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <p>Total rows: <strong>{result.totalCount || 0}</strong></p>
                <p>Valid: <strong className="text-green-700">{result.valid?.length || 0}</strong></p>
                <p>Invalid: <strong className="text-red-700">{result.invalid?.length || 0}</strong></p>
                <p>Valid amount: <strong>{formatCurrency(result.totalAmount)}</strong></p>
            </div>
            {result.invalid?.length > 0 && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                <p className="font-bold">Rows needing attention</p>
                {result.invalid.slice(0, 10).map((row) => <p key={row.rowIndex}>Row {row.rowIndex}: {row.errors.join(', ')}</p>)}
                {result.invalid.length > 10 && <p>And {result.invalid.length - 10} more invalid rows.</p>}
            </div>}
            <button type="button" onClick={submitBulk} disabled={loading || !result.valid?.length || result.insufficientBalance} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-50">{loading ? 'Submitting...' : 'Submit Bulk Payout'}</button>
            {result.insufficientBalance && <p className="text-xs text-red-600">The total valid amount exceeds your available balance. The complete batch will be rejected.</p>}
        </div>}

        {submittedBatch && <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="flex items-center justify-between gap-3"><strong>Batch {String(submittedBatch._id).slice(-8).toUpperCase()}</strong><StatusBadge status={submittedBatch.status} /></div>
            <p className="mt-2">{submittedBatch.validRows} submitted · {formatCurrency(submittedBatch.totalAmount)} · {submittedBatch.successCount || 0} successful · {submittedBatch.failedCount || 0} failed · {submittedBatch.processingCount || 0} processing</p>
            <button type="button" onClick={() => showBatch(submittedBatch._id)} className="mt-3 font-semibold text-blue-700 underline">View individual payouts</button>
        </div>}

        <div className="mt-6 flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-600">Need a template to get started?</div>
            <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-blue-600 text-sm font-semibold hover:text-blue-700"
            >
                <Download className="w-4 h-4" /> Download Sample CSV
            </button>
        </div>
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-5"><div><h2 className="text-lg font-bold text-gray-900">Bulk Payout History</h2><p className="text-xs text-gray-400 mt-1">Track submitted batches and individual results.</p></div><button type="button" onClick={loadBatches} title="Refresh bulk payout history" className="text-blue-600"><RefreshCw className="h-4 w-4" /></button></div>
        {batches.length === 0 ? <p className="p-5 text-sm text-gray-500">No bulk payout batches found.</p> : <div className="divide-y divide-gray-100">{batches.map((batch) => <button type="button" key={batch._id} onClick={() => showBatch(batch._id)} className="flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-gray-50"><span><strong className="font-mono text-xs text-blue-600">{String(batch._id).slice(-8).toUpperCase()}</strong><span className="ml-3 text-xs text-gray-400">{new Date(batch.createdAt).toLocaleString('en-IN')}</span><span className="mt-1 block text-sm text-gray-700">{batch.validRows} payouts · {formatCurrency(batch.totalAmount)}</span></span><span className="text-right"><StatusBadge status={batch.status} /><span className="mt-1 block text-xs text-gray-400">{batch.successCount || 0} success · {batch.failedCount || 0} failed</span></span></button>)}</div>}
    </div>

    {selectedBatch && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="flex items-center justify-between border-b border-gray-100 p-5"><h2 className="text-lg font-bold text-gray-900">Batch Details</h2><button type="button" onClick={() => setSelectedBatch(null)} title="Close batch details" className="text-gray-500"><XCircle className="h-5 w-5" /></button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr className="text-left text-xs text-gray-500"><th className="px-5 py-3">Row</th><th className="px-5 py-3">Beneficiary</th><th className="px-5 py-3">Account</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{(selectedBatch.results || []).map((row) => <tr key={row.payoutId || row.rowIndex}><td className="px-5 py-3">{row.rowIndex}</td><td className="px-5 py-3">{row.beneficiary_name}</td><td className="px-5 py-3 font-mono text-xs">••••{row.account_number_last4}</td><td className="px-5 py-3">{formatCurrency(row.amount)}</td><td className="px-5 py-3"><StatusBadge status={row.status} /></td></tr>)}</tbody></table></div></div>}
    </>
    );
};

// ------------------------------------------------------------
// Scheduled Section
// ------------------------------------------------------------

const ScheduledSection = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        apiClient.get('/payouts/scheduled')
            .then((response) => {
                if (active) setSchedules(response.data?.schedules || []);
            })
            .catch((error) => {
                if (!active || error?.isCanceled) return;
                toast.error(error.response?.data?.msg || 'Unable to load schedules');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);
    return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Scheduled Payouts</h2>
                <p className="text-xs text-gray-400 mt-1">Upcoming and recurring payout runs</p>
            </div>
            <span className="text-xs text-gray-400">Create schedules from an approved scheduling workflow.</span>
        </div>
        <div className="divide-y divide-gray-100">
            {loading ? <p className="p-5 text-sm text-gray-500">Loading schedules...</p> : schedules.length === 0 ? <p className="p-5 text-sm text-gray-500">No scheduled payouts found.</p> : schedules.map((s) => (
                <div key={s.id} className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <CalendarClock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{s.beneficiary_name}</p>
                            <p className="text-xs text-gray-400">Runs on {new Date(s.nextRunAt).toLocaleDateString('en-IN')} · {s.frequency}</p>
                        </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(s.amount)}</p>
                </div>
            ))}
        </div>
    </div>
    );
};

// ------------------------------------------------------------
// History Section
// ------------------------------------------------------------

const PAYOUT_STATUS_OPTIONS = ['all', 'success', 'processing', 'pending', 'failed', 'unknown'];
const HISTORY_PAGE_SIZE = 20;

const HistorySection = () => {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    const [payouts, setPayouts] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Debounce free-text search so every keystroke doesn't hit the API.
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchHistory = useCallback(() => {
        let active = true;
        setLoading(true);
        setError('');
        apiClient.get('/payouts/my-payouts', {
            params: {
                page,
                limit: HISTORY_PAGE_SIZE,
                search: search || undefined,
                status: statusFilter === 'all' ? undefined : statusFilter,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            },
        })
            .then((response) => {
                if (!active) return;
                setPayouts(response.data?.payouts || []);
                setTotal(response.data?.total || 0);
                setPages(response.data?.pages || 1);
            })
            .catch((err) => {
                if (!active || err?.isCanceled) return;
                setError(err.response?.data?.msg || 'Unable to load payout history');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [page, search, statusFilter, dateFrom, dateTo]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchHistory's setLoading(true)/setError('') are the standard "start a fresh fetch" reset used throughout this file, not a render-loop hazard
    useEffect(() => fetchHistory(), [fetchHistory]);

    const hasActiveFilters = Boolean(search || statusFilter !== 'all' || dateFrom || dateTo);

    const clearFilters = () => {
        setSearchInput('');
        setSearch('');
        setStatusFilter('all');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Payout History</h2>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[220px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search ID, beneficiary, txn ref..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 capitalize"
                        >
                            {PAYOUT_STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option === 'all' ? 'All Statuses' : option}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {hasActiveFilters && (
                        <button type="button" onClick={clearFilters} className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-1 py-2">
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <p className="p-8 text-sm text-gray-500">Loading payout history...</p>
            ) : error ? (
                <div className="p-8 flex flex-col items-center gap-2 text-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <p className="text-sm text-gray-600">{error}</p>
                    <button type="button" onClick={fetchHistory} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Try again</button>
                </div>
            ) : payouts.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">
                    {hasActiveFilters ? 'No payouts match the current filters.' : 'No payouts found.'}
                </p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs text-gray-500">
                                    <th className="px-5 py-3 font-semibold">ID</th>
                                    <th className="px-5 py-3 font-semibold">Beneficiary</th>
                                    <th className="px-5 py-3 font-semibold">Bank</th>
                                    <th className="px-5 py-3 font-semibold">Amount</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payouts.map((p) => (
                                    <tr key={p._id} className="hover:bg-gray-50 transition">
                                        <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-600">{String(p._id).slice(-8).toUpperCase()}</td>
                                        <td className="px-5 py-4 text-gray-700">{p.beneficiary_name}</td>
                                        <td className="px-5 py-4 text-gray-500">{p.bank_name || '—'}</td>
                                        <td className="px-5 py-4 font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                                        <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                                        <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{new Date(p.createdAt).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
                        <span>Page {page} of {pages} · {total} payout{total === 1 ? '' : 's'}</span>
                        <div className="flex items-center gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
                            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ------------------------------------------------------------
// Failed Section
// ------------------------------------------------------------

const FailedSection = () => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        apiClient.get('/payouts/my-payouts', { params: { status: 'failed', limit: 100 } })
            .then((response) => {
                if (active) setPayouts(response.data?.payouts || []);
            })
            .catch((error) => {
                if (!active || error?.isCanceled) return;
                toast.error(error.response?.data?.msg || 'Unable to load failed payouts');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);
    return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Failed Payouts</h2>
            <p className="text-xs text-gray-400 mt-1">Review and retry failed transactions</p>
        </div>
        <div className="divide-y divide-gray-100">{loading ? <p className="p-8 text-sm text-gray-500">Loading failed payouts...</p> : payouts.length === 0 ? <p className="p-8 text-sm text-gray-500">No failed payouts found.</p> : payouts.map((p) => (
            <div key={p._id} className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{p.beneficiary_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{String(p._id).slice(-8).toUpperCase()} · {new Date(p.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
    );
};

// ------------------------------------------------------------
// Payouts (module entry)
// ------------------------------------------------------------

// Defaults to enabled when unset, mirroring the backend's BULK_PAYOUT_ENABLED
// flag - only an explicit "false" hides the tab (e.g. local dev without Redis).
const BULK_PAYOUT_ENABLED = import.meta.env.VITE_BULK_PAYOUT_ENABLED !== 'false';

const TABS = ['Create Payout', ...(BULK_PAYOUT_ENABLED ? ['Bulk Payout'] : []), 'Scheduled', 'History', 'Failed'];

const Payouts = ({ view, onNavigate }) => {
    const active = TABS.includes(view) ? view : 'Create Payout';

    const setTab = (tab) => {
        if (onNavigate) onNavigate(tab);
    };

    return (
        <div className="w-full pb-12 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-7 h-7 text-blue-600" /> Payouts
                </h1>
                <p className="text-sm text-gray-500 mt-1">Create, schedule, and track outgoing payouts.</p>
            </div>

            <div className="flex flex-wrap gap-2 bg-gray-100 rounded-xl p-1 w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${active === tab
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:text-blue-600 shadow-sm'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {active === 'Create Payout' && <CreatePayoutSection onNavigate={onNavigate} />}
            {active === 'Bulk Payout' && <BulkPayoutSection />}
            {active === 'Scheduled' && <ScheduledSection />}
            {active === 'History' && <HistorySection />}
            {active === 'Failed' && <FailedSection />}
        </div>
    );
};

export default Payouts;
