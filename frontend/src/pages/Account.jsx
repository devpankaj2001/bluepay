import React, { useState, useEffect, useRef } from 'react';
import {
    User, Camera, Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle,
    ShieldCheck, ShieldX, Upload, AlertTriangle, Clock, XCircle, RefreshCw, TicketIcon,
} from 'lucide-react';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import { API_BASE } from '../api/config';

/* ------------------------------------------------------------------ */
/* Shared small helpers                                                */
/* ------------------------------------------------------------------ */

const FieldError = ({ msg }) => msg ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{msg}</p> : null;

const FileInput = ({ label, name, accept = '.jpg,.jpeg,.png,.pdf', onChange, error, required }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
        <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-blue-400 transition ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:bg-blue-50'}`}>
            <Upload className={`w-4 h-4 shrink-0 ${error ? 'text-red-400' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-500">Click to upload (PDF, JPG, PNG — max 5MB)</span>
            <input type="file" name={name} accept={accept} className="hidden" onChange={onChange} />
        </label>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
);

/* ------------------------------------------------------------------ */
/* Section: Profile Settings (from account/ProfileSettings.jsx)       */
/* ------------------------------------------------------------------ */

const ProfileSettingsSection = ({ onProfileUpdated }) => {
    const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', mobile_number: '', company_name: '', profile_image: '' });
    const [profileErrors, setProfileErrors] = useState({});
    const [profileLoading, setProfileLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [previewImg, setPreviewImg] = useState(null);
    const [imgFile, setImgFile] = useState(null);
    const fileRef = useRef();

    const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwErrors, setPwErrors] = useState({});
    const [pwLoading, setPwLoading] = useState(false);
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });


    useEffect(() => {
        let active = true;

        apiClient.get('/account/profile')
            .then(r => {
                const data = r.data || {};
                if (data.success === false || data.error) {
                    throw new Error(data.error || 'Profile request failed');
                }
                if (active) setProfile(data);
            })
            .catch(err => {
                if (!active || err?.isCanceled) return;
                toast.error(err.response?.data?.msg || err.message || 'Failed to load profile');
            })
            .finally(() => {
                if (active) setPageLoading(false);
            });

        return () => { active = false; };
    }, []);

    const handleImgChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Use a JPG, PNG, or WEBP image'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
        setImgFile(file);
        setPreviewImg(URL.createObjectURL(file));
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileErrors({});
        setProfileLoading(true);
        try {
            const fd = new FormData();
            fd.append('first_name', profile.first_name);
            fd.append('last_name', profile.last_name);
            fd.append('company_name', profile.company_name);
            if (imgFile) fd.append('profile_image', imgFile);

            const r = await apiClient.post('/account/update-profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setProfile(r.data.user);
            if (onProfileUpdated) onProfileUpdated(r.data.user);
            toast.success('Profile updated successfully');
        } catch (err) {
            if (err.response?.data?.errors) setProfileErrors(err.response.data.errors);
            else toast.error(err.response?.data?.msg || 'Something went wrong. Please try again.');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePwSave = async (e) => {
        e.preventDefault();
        setPwErrors({});
        setPwLoading(true);
        try {
            await apiClient.post('/account/change-password', pwData);
            toast.success('Password changed successfully');
            setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            if (err.response?.data?.errors) setPwErrors(err.response.data.errors);
            else if (err.response?.data?.msg) toast.error(err.response.data.msg);
            else toast.error('Something went wrong. Please try again.');
        } finally {
            setPwLoading(false);
        }
    };

    if (pageLoading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-100 rounded-xl w-64" />
            <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
    );

    const imgSrc = previewImg || (profile.profile_image ? `${API_BASE}${profile.profile_image}` : null);

    return (
        <div className="w-full pb-12 space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2"><User className="w-7 h-7 text-blue-600" /> Profile Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your personal information and login credentials.</p>
            </div>

            {/* Basic Info */}
            <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-sm font-black text-gray-900">Basic Information</p>
                    <p className="text-xs text-gray-400 mt-0.5">Update your personal details</p>
                </div>
                <div className="p-6 space-y-5">
                    {/* Avatar */}
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            {imgSrc ? (
                                <img src={imgSrc} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100 shadow" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black shadow">
                                    {profile.first_name?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                            <button type="button" onClick={() => fileRef.current?.click()}
                                className="absolute -bottom-2 -right-2 p-1.5 bg-slate-900 rounded-xl text-white hover:bg-slate-700 transition shadow-md">
                                <Camera className="w-3.5 h-3.5" />
                            </button>
                            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImgChange} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">{profile.first_name} {profile.last_name}</p>
                            <p className="text-xs text-gray-400">{profile.email}</p>
                            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-blue-600 font-semibold mt-1 hover:underline">Change photo</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name <span className="text-red-400">*</span></label>
                            <input value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${profileErrors.first_name ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                placeholder="First name" />
                            <FieldError msg={profileErrors.first_name} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name <span className="text-red-400">*</span></label>
                            <input value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${profileErrors.last_name ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                placeholder="Last name" />
                            <FieldError msg={profileErrors.last_name} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                            <input value={profile.email} readOnly
                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Verified — email cannot be changed</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mobile Number</label>
                            <input value={profile.mobile_number} readOnly
                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                            <p className="text-xs text-gray-400 mt-1">Mobile changes require the existing verification flow.</p>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company Name <span className="text-gray-400">(optional)</span></label>
                            <input value={profile.company_name || ''} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Your company name" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-5 text-sm">
                        <div><p className="text-xs text-gray-500">Account Type</p><p className="mt-1 font-semibold capitalize">{profile.accountType || '-'}</p></div>
                        <div><p className="text-xs text-gray-500">KYC Status</p><p className="mt-1 font-semibold capitalize">{profile.kycStatus || 'unverified'}</p></div>
                        <div><p className="text-xs text-gray-500">Account Status</p><p className="mt-1 font-semibold">{profile.status === 1 ? 'Active' : 'Inactive'}</p></div>
                        <div className="sm:col-span-3"><p className="text-xs text-gray-500">Created At</p><p className="mt-1 font-semibold">{profile.createdAt ? new Date(profile.createdAt).toLocaleString('en-IN') : '-'}</p></div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={profileLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-60 shadow-sm">
                        {profileLoading ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" /> : <Save className="w-4 h-4" />}
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            {/* Change Password */}
            <form onSubmit={handlePwSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-sm font-black text-gray-900 flex items-center gap-2"><Lock className="w-4 h-4 text-red-500" /> Change Password</p>
                    <p className="text-xs text-gray-400 mt-0.5">Use a strong password of at least 8 characters</p>
                </div>
                <div className="p-6 space-y-4">
                    {[
                        { key: 'currentPassword', label: 'Current Password', show: 'current' },
                        { key: 'newPassword', label: 'New Password', show: 'new' },
                        { key: 'confirmPassword', label: 'Confirm New Password', show: 'confirm' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label} <span className="text-red-400">*</span></label>
                            <div className="relative">
                                <input type={showPw[f.show] ? 'text' : 'password'}
                                    value={pwData[f.key]}
                                    onChange={e => setPwData(p => ({ ...p, [f.key]: e.target.value }))}
                                    className={`w-full px-4 py-2.5 pr-10 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${pwErrors[f.key] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                    placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPw(p => ({ ...p, [f.show]: !p[f.show] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPw[f.show] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <FieldError msg={pwErrors[f.key]} />
                        </div>
                    ))}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={pwLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-60 shadow-sm">
                        {pwLoading ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" /> : <Lock className="w-4 h-4" />}
                        {pwLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </form>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Section: KYC Status (from account/KYCStatus.jsx)                   */
/* ------------------------------------------------------------------ */

const KYCStatusSection = ({ onNavigate }) => {
    const [kyc, setKyc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [businessKYC, setBusinessKYC] = useState(false);
    const [form, setForm] = useState({ pan_number: '', aadhaar_number: '', gst_number: '' });
    const [files, setFiles] = useState({});
    const [errors, setErrors] = useState({});

    const loadStatus = () => {
        setLoading(true);
        apiClient.get('/kyc/status')
            .then(r => {
                const data = r.data || {};
                if (data.success === false || data.error) {
                    throw new Error(data.error || 'KYC status request failed');
                }
                setKyc(data);
                setBusinessKYC(data.kycType === 'business');
            })
            .catch(err => {
                if (err?.isCanceled) return;
                toast.error(err.response?.data?.msg || err.message || 'Failed to load KYC status');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadStatus(); }, []);

    const handleFile = (e) => {
        const { name, files: f } = e.target;
        if (f[0] && !['application/pdf', 'image/jpeg', 'image/png'].includes(f[0].type)) { toast.error(`${name}: Use PDF, JPG, or PNG`); return; }
        if (f[0] && f[0].size > 5 * 1024 * 1024) { toast.error(`${name}: File size must be under 5MB`); return; }
        setFiles(p => ({ ...p, [name]: f[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('kycType', businessKYC ? 'business' : 'individual');
            if (businessKYC) {
                fd.append('gst_number', form.gst_number.trim());
            } else {
                fd.append('pan_number', form.pan_number.toUpperCase().trim());
                fd.append('aadhaar_number', form.aadhaar_number.trim());
            }
            Object.entries(files).forEach(([k, v]) => fd.append(k, v));

            await apiClient.post('/kyc/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('KYC submitted successfully!');
            loadStatus();
        } catch (err) {
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
            else toast.error(err.response?.data?.msg || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse max-w-3xl">
            <div className="h-8 bg-gray-100 rounded-xl w-56" />
            <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
    );

    const isVerified = kyc?.status === 'approved' || kyc?.status === 'verified';
    const isPending = kyc?.status === 'pending';
    const isRejected = kyc?.status === 'rejected';
    const showForm = !kyc?.status || kyc.status === 'not_submitted' || kyc.status === 'rejected';

    return (
        <div className="w-full pb-12 space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
                    {isVerified
                        ? <ShieldCheck className="w-7 h-7 text-emerald-600" />
                        : <ShieldX className="w-7 h-7 text-gray-400" />}
                    KYC Verification
                </h1>
                <p className="text-sm text-gray-500 mt-1">Submit your identity documents to unlock full platform access.</p>
            </div>

            {/* Main Status Card — only Verified or Not Verified */}
            <div className={`rounded-2xl border shadow-sm p-6 ${isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${isVerified ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            {isVerified
                                ? <CheckCircle className="w-8 h-8 text-emerald-600" />
                                : <AlertTriangle className="w-8 h-8 text-gray-400" />}
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">KYC Status</p>
                            <p className={`text-2xl font-black ${isVerified ? 'text-emerald-700' : 'text-gray-700'}`}>
                                {isVerified ? '✓ KYC Verified' : isPending ? 'KYC Verification Pending' : isRejected ? 'KYC Rejected' : 'KYC Not Submitted'}
                            </p>
                            {kyc?.updatedAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Last updated: {new Date(kyc.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                    </div>
                    {!isVerified && (
                        <div className="flex flex-col gap-2">
                            <button onClick={loadStatus} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
                                <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
                            </button>
                        </div>
                    )}
                </div>

                {/* Sub-status info (pending / rejected / not submitted) — shown only when not verified */}
                {!isVerified && (
                    <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                        {isPending && (
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800">Documents Under Review</p>
                                    <p className="text-xs text-amber-600 mt-0.5">Your documents have been submitted and are under review. Typical review time is 24–48 hours. You will be notified once verified.</p>
                                </div>
                            </div>
                        )}
                        {isRejected && (
                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-red-800">KYC Rejected — Please Re-submit</p>
                                    <p className="text-xs text-red-600 mt-0.5">
                                        <strong>Reason:</strong> {kyc?.rejection_reason || 'Please re-submit with correct and clear documents.'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {!isPending && !isRejected && (
                            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <Upload className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-blue-800">KYC Not Submitted</p>
                                    <p className="text-xs text-blue-600 mt-0.5">Please complete your KYC verification below to access Developer tools and generate API keys.</p>
                                </div>
                            </div>
                        )}

                        {/* Raise Ticket CTA for unverified users */}
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Having trouble with KYC?</p>
                                <p className="text-xs text-gray-500 mt-0.5">Raise a support ticket and our team will assist you.</p>
                            </div>
                            {onNavigate && (
                                <button
                                    onClick={() => onNavigate('Raise Ticket')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-sm shrink-0"
                                >
                                    <TicketIcon className="w-3.5 h-3.5" /> Raise Ticket
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {isVerified && (
                    <div className="mt-4 text-sm text-emerald-600 font-medium">
                        🎉 Your identity has been verified. You have full access to all platform features including Developer API tools.
                    </div>
                )}
            </div>

            {/* Upload Form — shown only when not submitted or rejected */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-black text-gray-900">{kyc?.status === 'rejected' ? 'Re-upload Documents' : 'Submit KYC Documents'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">All files must be PDF, JPG, or PNG — max 5MB each</p>
                        </div>
                        {kyc?.status === 'rejected' && <span className="flex items-center gap-1 text-xs text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full"><RefreshCw className="w-3 h-3" /> Re-submission</span>}
                    </div>
                    <div className="p-6 space-y-6">
                        {/* KYC Type Toggle */}
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-2">KYC Type</label>
                            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                                {[['individual', 'Individual'], ['business', 'Business']].map(([val, label]) => (
                                    <button type="button" key={val} onClick={() => setBusinessKYC(val === 'business')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${(businessKYC ? 'business' : 'individual') === val ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>{label}</button>
                                ))}
                            </div>
                        </div>

                        {/* Individual Fields */}
                        {!businessKYC && <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Individual KYC</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">PAN Card Number <span className="text-red-400">*</span></label>
                                    <input value={form.pan_number} onChange={e => setForm(p => ({ ...p, pan_number: e.target.value.toUpperCase() }))} maxLength={10}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 ${errors.pan_number ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                        placeholder="ABCDE1234F" />
                                    {errors.pan_number && <p className="text-xs text-red-500 mt-1">{errors.pan_number}</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Aadhaar Number <span className="text-red-400">*</span></label>
                                    <input value={form.aadhaar_number} onChange={e => setForm(p => ({ ...p, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 ${errors.aadhaar_number ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                        placeholder="12-digit Aadhaar number" maxLength={12} />
                                    {errors.aadhaar_number && <p className="text-xs text-red-500 mt-1">{errors.aadhaar_number}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FileInput label="PAN Card Upload" name="pan_file" onChange={handleFile} error={errors.pan_file} required />
                                <FileInput label="Aadhaar Upload" name="aadhaar_file" onChange={handleFile} error={errors.aadhaar_file} required />
                                <FileInput label="Selfie Photo" name="selfie_file" accept=".jpg,.jpeg,.png" onChange={handleFile} error={errors.selfie_file} required />
                            </div>
                        </div>}

                        {/* Business KYC */}
                        {businessKYC && (
                            <div className="space-y-4 border-t border-gray-100 pt-5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Business KYC</p>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">GST Number <span className="text-red-400">*</span></label>
                                    <input value={form.gst_number} onChange={e => setForm(p => ({ ...p, gst_number: e.target.value.toUpperCase() }))} maxLength={15}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 ${errors.gst_number ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                                        placeholder="22AAAAA0000A1Z5" />
                                    {errors.gst_number && <p className="text-xs text-red-500 mt-1">{errors.gst_number}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FileInput label="GST Certificate" name="gst_file" onChange={handleFile} error={errors.gst_file} required />
                                    <FileInput label="Company Registration Doc" name="company_doc_file" onChange={handleFile} error={errors.company_doc_file} required />
                                </div>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                            🔒 Documents are stored privately and are available only to authorized reviewers.
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                        <button type="submit" disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-60 shadow-sm">
                            {submitting ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" /> : <Upload className="w-4 h-4" />}
                            {submitting ? 'Submitting...' : 'Submit KYC'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Main consolidated Account page                                     */
/* ------------------------------------------------------------------ */

const TABS = ['Profile Settings', 'KYC Status'];

const Account = ({ view, onNavigate, onProfileUpdated }) => {
    const [activeTab, setActiveTab] = useState(TABS.includes(view) ? view : 'Profile Settings');
    const selectedTab = TABS.includes(view) ? view : activeTab;

    return (
        <div className="w-full">
            {/* Internal tab switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${selectedTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {selectedTab === 'KYC Status'
                ? <KYCStatusSection onNavigate={onNavigate} />
                : <ProfileSettingsSection onProfileUpdated={onProfileUpdated} />}
        </div>
    );
};

export default Account;
