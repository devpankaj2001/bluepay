import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import { Save, RefreshCw, AlertTriangle } from 'lucide-react';

const TABS = [
    { id: 'bank', label: 'Bank Details' },
    { id: 'basic', label: 'Basic Settings' },
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
];

const Settings = () => {
    const [activeTab, setActiveTab] = useState('bank');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);

    const [bankSettings, setBankSettings] = useState({
        bank_name: '',
        account_number: '',
        account_type: '',
        holder_name: '',
        ifsc_code: '',
        upi_id: '',
    });

    const [basicSettings, setBasicSettings] = useState({
        site_name: '',
        mobile_number: '',
        whatsapp_number: '',
        support_email: '',
        support_start_time: '',
        support_end_time: '',
    });

    const [profile, setProfile] = useState({ first_name: '', last_name: '', company_name: '', email: '', mobile_number: '' });
    const [profileImageFile, setProfileImageFile] = useState(null);

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setFetching(true);
        setError(null);
        try {
            const [settingsRes, profileRes] = await Promise.all([
                apiClient.get('/settings'),
                apiClient.get('/account/profile'),
            ]);
            if (settingsRes.data) {
                setBankSettings({
                    bank_name: settingsRes.data.bank_name || '',
                    account_number: settingsRes.data.account_number || '',
                    account_type: settingsRes.data.account_type || '',
                    holder_name: settingsRes.data.holder_name || '',
                    ifsc_code: settingsRes.data.ifsc_code || '',
                    upi_id: settingsRes.data.upi_id || '',
                });
                setBasicSettings({
                    site_name: settingsRes.data.site_name || '',
                    mobile_number: settingsRes.data.mobile_number || '',
                    whatsapp_number: settingsRes.data.whatsapp_number || '',
                    support_email: settingsRes.data.support_email || '',
                    support_start_time: settingsRes.data.support_start_time || '',
                    support_end_time: settingsRes.data.support_end_time || '',
                });
            }
            if (profileRes.data) {
                setProfile({
                    first_name: profileRes.data.first_name || '',
                    last_name: profileRes.data.last_name || '',
                    company_name: profileRes.data.company_name || '',
                    email: profileRes.data.email || '',
                    mobile_number: profileRes.data.mobile_number || '',
                });
            }
        } catch (err) {
            if (err?.isCanceled || err?.message === 'canceled') return;
            setError(err.response?.data?.msg || 'Failed to load settings');
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = activeTab === 'bank' ? bankSettings : basicSettings;
        try {
            await apiClient.put('/settings', payload);
            toast.success(`${activeTab === 'bank' ? 'Bank details' : 'Basic settings'} updated successfully!`);
        } catch {
            toast.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const handleBankChange = (e) => setBankSettings({ ...bankSettings, [e.target.name]: e.target.value });
    const handleBasicChange = (e) => setBasicSettings({ ...basicSettings, [e.target.name]: e.target.value });
    const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
    const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

    const saveProfile = async (e) => {
        e.preventDefault();
        if (!profile.first_name.trim() || !profile.last_name.trim()) {
            toast.error('First and last name are required');
            return;
        }
        setProfileLoading(true);
        try {
            const formData = new FormData();
            formData.append('first_name', profile.first_name.trim());
            formData.append('last_name', profile.last_name.trim());
            formData.append('company_name', profile.company_name || '');
            if (profileImageFile) formData.append('profile_image', profileImageFile);

            await apiClient.post('/account/update-profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Profile updated successfully');
            setProfileImageFile(null);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const savePassword = async (e) => {
        e.preventDefault();
        if (!passwordForm.currentPassword) {
            toast.error('Current password is required');
            return;
        }
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setPasswordLoading(true);
        try {
            await apiClient.post('/account/change-password', passwordForm);
            toast.success('Password changed successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                Object.values(errors).forEach((msg) => toast.error(msg));
            } else {
                toast.error(err.response?.data?.msg || 'Failed to change password');
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    if (fetching) return <Layout><div className="flex h-[200px] justify-center items-center"><RefreshCw className="animate-spin text-indigo-500 w-8 h-8" /></div></Layout>;

    if (error) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-sm">{error}</span>
                    <button onClick={fetchAll} className="text-xs underline text-gray-500 hover:text-gray-700">Retry</button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Header Section */}
            <div className="flex items-center gap-3 mt-8 mb-8">
                <h1 className="text-[3rem] font-medium text-gray-900 tracking-tight leading-none">Settings</h1>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="border-b border-gray-100 px-6">
                    <nav className="-mb-px flex">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {(activeTab === 'bank' || activeTab === 'basic') && (
                        <form onSubmit={handleSave}>
                            {activeTab === 'bank' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                                        <select name="account_type" value={bankSettings.account_type} onChange={handleBankChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="Current">Current</option>
                                            <option value="Savings">Savings</option>
                                            <option value="Virtual">Virtual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                        <input type="text" name="bank_name" value={bankSettings.bank_name} onChange={handleBankChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. HDFC Bank" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                                        <input type="text" name="account_number" value={bankSettings.account_number} onChange={handleBankChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0000 0000 0000" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                                        <input type="text" name="ifsc_code" value={bankSettings.ifsc_code} onChange={handleBankChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="HDFC0001234" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Holder Name</label>
                                        <input type="text" name="holder_name" value={bankSettings.holder_name} onChange={handleBankChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID (Optional)</label>
                                        <input type="text" name="upi_id" value={bankSettings.upi_id} onChange={handleBankChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="john@upi" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                                        <input type="text" name="site_name" value={basicSettings.site_name} onChange={handleBasicChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="BluePay Solutions" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Support Email ID</label>
                                        <input type="email" name="support_email" value={basicSettings.support_email} onChange={handleBasicChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="support@site.com" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                                        <input type="text" name="mobile_number" value={basicSettings.mobile_number} onChange={handleBasicChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+91 XXXXXXXXXX" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
                                        <input type="text" name="whatsapp_number" value={basicSettings.whatsapp_number} onChange={handleBasicChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+91 XXXXXXXXXX" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Support Start Time</label>
                                        <input type="text" name="support_start_time" value={basicSettings.support_start_time} onChange={handleBasicChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 09:00 AM" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Support End Time</label>
                                        <input type="text" name="support_end_time" value={basicSettings.support_end_time} onChange={handleBasicChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 06:00 PM" />
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-full shadow hover:bg-black transition disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'profile' && (
                        <form onSubmit={saveProfile}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                    <input type="text" name="first_name" value={profile.first_name} onChange={handleProfileChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                    <input type="text" name="last_name" value={profile.last_name} onChange={handleProfileChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input type="email" value={profile.email} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                                    <input type="text" value={profile.mobile_number} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name (Optional)</label>
                                    <input type="text" name="company_name" value={profile.company_name} onChange={handleProfileChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image (Optional)</label>
                                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-600" />
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-full shadow hover:bg-black transition disabled:opacity-50"
                                >
                                    {profileLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'security' && (
                        <form onSubmit={savePassword} className="max-w-md">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                    <input type="password" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" autoComplete="current-password" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                    <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" autoComplete="new-password" />
                                    <p className="text-xs text-gray-400 mt-1">At least 8 characters.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                    <input type="password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" autoComplete="new-password" />
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-full shadow hover:bg-black transition disabled:opacity-50"
                                >
                                    {passwordLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Change Password
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
