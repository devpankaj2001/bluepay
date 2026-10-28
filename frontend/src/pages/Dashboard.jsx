import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

import Wallet from './Wallet';
import Payouts from './Payouts';
import Analytics from './Analytics';
import Developers from './Developers';
import ActivityLogs from './ActivityLogs';
import Reports from './Reports';
import Security from './Security';
import Account from './Account';
import Support from './Support';
import RecentActivity from './RecentActivity';
// import QuickStats from '../components/dashboard/QuickStats';

// ------------------------------------------------------------
// View groupings — which module owns which sidebar sub-view
// ------------------------------------------------------------

const WALLET_VIEWS = ['Wallet Overview', 'Add Funds', 'Transaction', 'Download Statement'];
const PAYOUT_VIEWS = ['Create Payout', 'Bulk Payout', 'Scheduled', 'History', 'Failed'];
const ANALYTICS_VIEWS = ['Payout Analytics', 'API Usage', 'Success vs Failure', 'Monthly Summary'];
const DEVELOPER_VIEWS = ['API Overview', 'API Keys', 'Webhooks', 'API Logs', 'Rate Limits', 'API Documentation', 'SDK & Integration'];
const ACTIVITY_VIEWS = ['User Activity', 'API Activity', 'Login History', 'IP Logs'];
const REPORT_VIEWS = ['Transaction Reports', 'Wallet Reports', 'API Usage Reports', 'Export CSV / PDF'];
const SECURITY_VIEWS = ['Change Password', '2FA', 'Active Sessions', 'IP Whitelist'];
const ACCOUNT_VIEWS = ['Profile Settings', 'KYC Status'];
const SUPPORT_VIEWS = ['Raise Ticket', 'Ticket History', 'Contact Us'];

// ------------------------------------------------------------
// View <-> URL mapping
//
// The sidebar/section navigation used to live entirely in local React
// state (activeView), so the browser URL never changed and a refresh
// always landed back on the default 'Overview' view. This map makes the
// URL the source of truth instead: activeView is derived from
// location.pathname (see viewFromPath below) and setActiveView navigates
// to the matching path, so every existing `setActiveView('X')` /
// `onNavigate('X')` call site keeps working unchanged while the URL (and
// therefore refresh/back-forward/direct navigation) now reflects it.
// ------------------------------------------------------------

const VIEW_TO_PATH = {
    'Overview': '/dashboard',
    'Recent Activity': '/dashboard/recent-activity',
    'Wallet Overview': '/wallet/overview',
    'Add Funds': '/wallet/add-funds',
    'Transaction': '/wallet/transactions',
    'Download Statement': '/wallet/statement',
    'Create Payout': '/payouts/create',
    'Bulk Payout': '/payouts/bulk',
    'Scheduled': '/payouts/scheduled',
    'History': '/payouts/history',
    'Failed': '/payouts/failed',
    'Payout Analytics': '/analytics/payouts',
    'API Usage': '/analytics/api-usage',
    'Success vs Failure': '/analytics/success-failure',
    'Monthly Summary': '/analytics/monthly-summary',
    'API Overview': '/developers/overview',
    'API Keys': '/developers/api-keys',
    'Webhooks': '/developers/webhooks',
    'API Logs': '/developers/api-logs',
    'Rate Limits': '/developers/rate-limits',
    'API Documentation': '/developers/docs',
    'SDK & Integration': '/developers/sdk',
    'User Activity': '/activity/user',
    'API Activity': '/activity/api',
    'Login History': '/activity/login-history',
    'IP Logs': '/activity/ip-logs',
    'Transaction Reports': '/reports',
    'Wallet Reports': '/reports/wallets',
    'API Usage Reports': '/reports/api-usage',
    'Export CSV / PDF': '/reports/export',
    'Change Password': '/security/change-password',
    '2FA': '/security/2fa',
    'Active Sessions': '/security/sessions',
    'IP Whitelist': '/security/ip-whitelist',
    'Profile Settings': '/account/profile',
    'KYC Status': '/account/kyc',
    'Raise Ticket': '/support/raise-ticket',
    'Ticket History': '/support/tickets',
    'Contact Us': '/support/contact',
};

const PATH_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view]));

// Default sub-view shown for a recognized section prefix that doesn't
// exactly match one of the paths above (e.g. bare '/payouts').
const SECTION_DEFAULT_VIEW = [
    ['/wallet', 'Wallet Overview'],
    ['/payouts', 'Create Payout'],
    ['/analytics', 'Payout Analytics'],
    ['/developers', 'API Overview'],
    ['/activity', 'User Activity'],
    ['/reports', 'Transaction Reports'],
    ['/security', 'Change Password'],
    ['/account', 'Profile Settings'],
    ['/support', 'Raise Ticket'],
];

const viewFromPath = (pathname) => {
    if (PATH_TO_VIEW[pathname]) return PATH_TO_VIEW[pathname];
    const section = SECTION_DEFAULT_VIEW.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    return section ? section[1] : 'Overview';
};

import {
    LayoutDashboard,
    Wallet as WalletIcon,
    CreditCard,
    BarChart3,
    Key,
    Activity,
    FileText,
    Shield,
    User,
    HelpCircle,
    Bell,
    Search,
    ChevronDown,
    Plus,
    Menu,
    LogOut,
    CheckCircle,
    Lock,
    TrendingUp,
    AlertTriangle,
    RefreshCw,
    Globe,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    XCircle,
    CalendarDays,
    IndianRupee,
} from 'lucide-react';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
} from 'recharts';


// ------------------------------------------------------------
// Sidebar Components
// ------------------------------------------------------------

const SidebarItem = ({ icon, label, active, badge, children, onClick }) => {
    const IconComponent = icon;
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = children && children.length > 0;

    return (
        <div className="mb-1">
            <div
                className={`relative flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                onClick={() => (hasChildren ? setIsOpen(!isOpen) : onClick && onClick())}
            >
                <div className="flex items-center gap-3">
                    {IconComponent && (
                        <IconComponent
                            size={20}
                            strokeWidth={active ? 2.5 : 2}
                        />
                    )}

                    <span
                        className={`text-sm font-medium ${active ? 'font-semibold' : ''
                            }`}
                    >
                        {label}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {badge && (
                        <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}

                    {hasChildren && (
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                }`}
                        />
                    )}
                </div>

                {active && !hasChildren && (
                    <div className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full" />
                )}
            </div>

            {hasChildren && isOpen && (
                <div className="pl-11 pr-4 py-1 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
};


const SubMenuItem = ({ label, onClick, isActive }) => (
    <div
        onClick={onClick}
        className={`py-2 text-sm cursor-pointer block transition-colors ${isActive
            ? 'text-blue-600 font-bold'
            : 'text-gray-500 hover:text-blue-600'
            }`}
    >
        {label}
    </div>
);


// ------------------------------------------------------------
// Stat Card
// ------------------------------------------------------------

const StatCard = ({
    title,
    value,
    subtext,
    icon,
    iconBg = 'bg-blue-50',
    iconColor = 'text-blue-600',
    valueColor = 'text-gray-900',
}) => {
    const IconComponent = icon;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-5">
            <div className="flex items-start justify-between">
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
                >
                    {IconComponent && (
                        <IconComponent
                            className={`w-5 h-5 ${iconColor}`}
                        />
                    )}
                </div>

                <ArrowUpRight className="w-4 h-4 text-gray-300" />
            </div>

            <p className="text-sm font-medium text-gray-500 mt-4">
                {title}
            </p>

            <p className={`text-2xl font-bold mt-1 ${valueColor}`}>
                {value}
            </p>

            {subtext && (
                <p className="text-xs text-gray-400 mt-2">
                    {subtext}
                </p>
            )}
        </div>
    );
};


// ------------------------------------------------------------
// Status Badge
// ------------------------------------------------------------

const StatusBadge = ({ status }) => {
    const normalizedStatus = String(status || '').toLowerCase();

    if (normalizedStatus === 'success') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Success
            </span>
        );
    }

    if (normalizedStatus === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                <XCircle className="w-3.5 h-3.5" />
                Failed
            </span>
        );
    }

    if (normalizedStatus === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5" />
                Processing
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Pending
        </span>
    );
};



// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // The URL is the source of truth for which section is active (see the
    // VIEW_TO_PATH/viewFromPath mapping above) - this is what makes a
    // browser refresh, direct navigation, or back/forward land on the
    // correct section instead of always resetting to 'Overview'.
    const activeView = viewFromPath(location.pathname);
    const setActiveView = (view) => {
        const path = VIEW_TO_PATH[view] || '/dashboard';
        if (path !== location.pathname) navigate(path);
    };

    const [dashboardData, setDashboardData] = useState(null);
        const [dashboardLoading, setLoading] = useState(true);
        const [dashboardError, setDashboardError] = useState('');

    const [profileData, setProfileData] = useState(null);

    const [domainModal, setDomainModal] = useState(false);
    const [domainInput, setDomainInput] = useState('');
    const [domainSaving, setDomainSaving] = useState(false);

    const [analyticsRange, setAnalyticsRange] = useState('7 Days');

    // --------------------------------------------------------
    // Profile
    // --------------------------------------------------------

    useEffect(() => {
        apiClient
            .get('/account/profile')
            .then((r) => setProfileData(r.data))
            .catch(() => { });
    }, []);


    // --------------------------------------------------------
    // CCAvenue Add Money redirect result
    //
    // The backend (never the frontend) decides success/failure and
    // credits the wallet server-side before redirecting the browser
    // here with ?fundingStatus=... — this effect only reads that
    // result to show a toast; it never touches wallet balance.
    // --------------------------------------------------------

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fundingStatus = params.get('fundingStatus');

        if (!fundingStatus) return;

        if (fundingStatus === 'success') {
            toast.success('Payment successful! Your wallet has been credited.');
        } else if (fundingStatus === 'cancelled') {
            toast.error('Payment was cancelled.');
        } else {
            toast.error('Payment failed. Please try again.');
        }

        setActiveView('Wallet Overview');

        params.delete('fundingStatus');
        params.delete('orderId');

        const cleanQuery = params.toString();

        window.history.replaceState(
            {},
            '',
            `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}`
        );
    }, []);


    // --------------------------------------------------------
    // Save Domain
    // --------------------------------------------------------

    const handleSaveDomain = async () => {
        if (!domainInput.trim()) return;

        setDomainSaving(true);

        try {
            const r = await apiClient.post(
                '/account/update-profile',
                {
                    domain: domainInput.trim(),
                }
            );

            setProfileData(r.data.user);
            setDomainModal(false);
            setDomainInput('');

            toast.success('Domain saved!');
        } catch {
            toast.error('Failed to save domain');
        } finally {
            setDomainSaving(false);
        }
    };


    // --------------------------------------------------------
    // KYC
    // --------------------------------------------------------

    const kycStatus =
        profileData?.kycStatus ||
        dashboardData?.user?.kycStatus ||
        'unverified';

    const kycIsVerified = kycStatus === 'verified';

    const kycConfig = {
        verified: {
            label: 'Verified',
            cls: 'text-green-600',
            icon: <CheckCircle className="w-3 h-3" />,
        },

        unverified: {
            label: 'Not Verified',
            cls: 'text-gray-400',
            icon: <AlertTriangle className="w-3 h-3" />,
        },
    };

    const kycDisplay = kycIsVerified
        ? kycConfig.verified
        : kycConfig.unverified;


    // --------------------------------------------------------
    // Dashboard API
    // --------------------------------------------------------

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await apiClient.get('/users/dashboard');
                setDashboardData(res.data);
            } catch (err) {
                if (err?.isCanceled) return;

                console.error(
                    'Failed to fetch dashboard data',
                    err
                );
                    setDashboardError(err.response?.data?.msg || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);


    // --------------------------------------------------------
    // Logout
    // --------------------------------------------------------

    const handleLogout = () => {
        logout();
        navigate('/login');
    };


    // --------------------------------------------------------
    // Dashboard Data Helpers
    // --------------------------------------------------------

    const wallet = dashboardData?.wallet || {};
    const walletSummary = dashboardData?.walletSummary || {};

    const availableBalance = wallet.availableBalance;
    const lockedBalance = wallet.lockedBalance;
    const totalPayoutSent = wallet.totalPayoutSent;
    const totalFailed = wallet.totalFailed;
    const apiRequests = wallet.todayApiRequests;
    const successRate = wallet.successRate;

    const recentPayouts = dashboardData?.recentPayouts || [];
    const weeklyData = dashboardData?.weeklyData || [];


    // --------------------------------------------------------
    // Today's payout summary
    // --------------------------------------------------------

    const today = new Date();

    const todayPayouts = recentPayouts.filter((payout) => {
        if (!payout?.createdAt) return false;

        const payoutDate = new Date(payout.createdAt);

        return (
            payoutDate.getDate() === today.getDate() &&
            payoutDate.getMonth() === today.getMonth() &&
            payoutDate.getFullYear() === today.getFullYear()
        );
    });

    const todayTotalAmount = todayPayouts.reduce(
        (sum, payout) => sum + Number(payout.amount || 0),
        0
    );

    const todaySuccessful = todayPayouts.filter(
        (payout) =>
            String(payout.status).toLowerCase() === 'success'
    );

    const todayPending = todayPayouts.filter((payout) =>
        ['pending', 'processing'].includes(
            String(payout.status).toLowerCase()
        )
    );

    const todayFailed = todayPayouts.filter(
        (payout) =>
            String(payout.status).toLowerCase() === 'failed'
    );

    const todaySuccessfulAmount = todaySuccessful.reduce(
        (sum, payout) => sum + Number(payout.amount || 0),
        0
    );

    const todayPendingAmount = todayPending.reduce(
        (sum, payout) => sum + Number(payout.amount || 0),
        0
    );

    const todayFailedAmount = todayFailed.reduce(
        (sum, payout) => sum + Number(payout.amount || 0),
        0
    );


    // --------------------------------------------------------
    // Search recent transactions
    // --------------------------------------------------------

    const filteredPayouts = recentPayouts.filter((payout) => {
        const search = searchTerm.toLowerCase().trim();

        if (!search) return true;

        return (
            String(payout?._id || '')
                .toLowerCase()
                .includes(search) ||
            String(payout?.beneficiary_name || '')
                .toLowerCase()
                .includes(search) ||
            String(payout?.bank_name || '')
                .toLowerCase()
                .includes(search) ||
            String(payout?.status || '')
                .toLowerCase()
                .includes(search)
        );
    });


    // --------------------------------------------------------
    // Format amount
    // --------------------------------------------------------

    const formatCurrency = (amount) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    };


    // --------------------------------------------------------
    // Format date
    // --------------------------------------------------------

    const formatDate = (date) => {
        if (!date) return '-';

        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };


    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

            {(dashboardLoading || dashboardError) && (
                <div className="fixed right-4 top-4 z-50 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-lg">
                    {dashboardLoading ? 'Loading dashboard data...' : dashboardError}
                </div>
            )}

            {/* Mobile Sidebar Overlay */}

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}


            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <aside
                className={`w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-30 transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen
                    ? 'translate-x-0'
                    : '-translate-x-full'
                    }`}
            >

                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">

                    <div className="flex items-center gap-2 text-blue-600">
                        <Shield className="w-8 h-8 fill-current" />
                        <span className="text-xl font-bold text-gray-900">
                            BluePay
                        </span>
                    </div>

                    <button
                        onClick={() =>
                            setIsSidebarOpen(false)
                        }
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                    >
                        <ChevronDown className="w-6 h-6 rotate-90" />
                    </button>

                </div>


                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">

                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={activeView === 'Overview'}
                        onClick={() => setActiveView('Overview')}
                    />


                    <SidebarItem
                        icon={WalletIcon}
                        label="Wallet"
                        active={
                            activeView === 'Add Funds' ||
                            activeView === 'Wallet Overview' ||
                            activeView === 'Transaction' ||
                            activeView ===
                            'Download Statement'
                        }
                    >
                        <SubMenuItem
                            label="Wallet Overview"
                            onClick={() =>
                                setActiveView(
                                    'Wallet Overview'
                                )
                            }
                            isActive={
                                activeView ===
                                'Wallet Overview'
                            }
                        />

                        <SubMenuItem
                            label="Add Funds"
                            onClick={() =>
                                setActiveView('Add Funds')
                            }
                            isActive={
                                activeView === 'Add Funds'
                            }
                        />

                        <SubMenuItem
                            label="Transaction"
                            onClick={() =>
                                setActiveView('Transaction')
                            }
                            isActive={
                                activeView === 'Transaction'
                            }
                        />

                        <SubMenuItem
                            label="Download Statement"
                            onClick={() =>
                                setActiveView(
                                    'Download Statement'
                                )
                            }
                            isActive={
                                activeView ===
                                'Download Statement'
                            }
                        />
                    </SidebarItem>


                    <SidebarItem
                        icon={CreditCard}
                        label="Payouts"
                        badge="12"
                    >
                        <SubMenuItem
                            label="Create Payout"
                            onClick={() => setActiveView('Create Payout')}
                            isActive={activeView === 'Create Payout'}
                        />
                        <SubMenuItem
                            label="Bulk Payout"
                            onClick={() => setActiveView('Bulk Payout')}
                            isActive={activeView === 'Bulk Payout'}
                        />
                        <SubMenuItem
                            label="Scheduled"
                            onClick={() => setActiveView('Scheduled')}
                            isActive={activeView === 'Scheduled'}
                        />
                        <SubMenuItem
                            label="History"
                            onClick={() => setActiveView('History')}
                            isActive={activeView === 'History'}
                        />
                        <SubMenuItem
                            label="Failed"
                            onClick={() => setActiveView('Failed')}
                            isActive={activeView === 'Failed'}
                        />
                    </SidebarItem>


                    <SidebarItem
                        icon={BarChart3}
                        label="Analytics"
                        active={[
                            'Payout Analytics',
                            'API Usage',
                            'Success vs Failure',
                            'Monthly Summary',
                        ].includes(activeView)}
                    >
                        <SubMenuItem
                            label="Payout Analytics"
                            onClick={() =>
                                setActiveView(
                                    'Payout Analytics'
                                )
                            }
                            isActive={
                                activeView ===
                                'Payout Analytics'
                            }
                        />

                        <SubMenuItem
                            label="API Usage"
                            onClick={() =>
                                setActiveView('API Usage')
                            }
                            isActive={
                                activeView === 'API Usage'
                            }
                        />

                        <SubMenuItem
                            label="Success vs Failure"
                            onClick={() =>
                                setActiveView(
                                    'Success vs Failure'
                                )
                            }
                            isActive={
                                activeView ===
                                'Success vs Failure'
                            }
                        />

                        <SubMenuItem
                            label="Monthly Summary"
                            onClick={() =>
                                setActiveView(
                                    'Monthly Summary'
                                )
                            }
                            isActive={
                                activeView ===
                                'Monthly Summary'
                            }
                        />
                    </SidebarItem>


                    <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Developers
                    </div>


                    <SidebarItem
                        icon={Key}
                        label="Developers"
                        active={[
                            'API Overview',
                            'API Keys',
                            'Webhooks',
                            'API Logs',
                            'Rate Limits',
                            'API Documentation',
                            'SDK & Integration',
                        ].includes(activeView)}
                    >
                        {kycIsVerified && (
                            <SubMenuItem
                                label="API Overview"
                                onClick={() =>
                                    setActiveView(
                                        'API Overview'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'API Overview'
                                }
                            />
                        )}

                        {kycIsVerified && (
                            <SubMenuItem
                                label="API Keys"
                                onClick={() =>
                                    setActiveView(
                                        'API Keys'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'API Keys'
                                }
                            />
                        )}

                        {kycIsVerified && (
                            <SubMenuItem
                                label="Webhooks"
                                onClick={() =>
                                    setActiveView(
                                        'Webhooks'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'Webhooks'
                                }
                            />
                        )}

                        {kycIsVerified && (
                            <SubMenuItem
                                label="API Logs"
                                onClick={() =>
                                    setActiveView(
                                        'API Logs'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'API Logs'
                                }
                            />
                        )}

                        {kycIsVerified && (
                            <SubMenuItem
                                label="Rate Limits"
                                onClick={() =>
                                    setActiveView(
                                        'Rate Limits'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'Rate Limits'
                                }
                            />
                        )}

                        {kycIsVerified && (
                            <SubMenuItem
                                label="API Documentation"
                                onClick={() =>
                                    setActiveView(
                                        'API Documentation'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'API Documentation'
                                }
                            />
                        )}

                        {kycIsVerified && (
                            <SubMenuItem
                                label="SDK & Integration"
                                onClick={() =>
                                    setActiveView(
                                        'SDK & Integration'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'SDK & Integration'
                                }
                            />
                        )}

                        {!kycIsVerified && (
                            <div className="py-2 px-1">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                                    <p className="font-bold mb-1">
                                        🔒 KYC Required
                                    </p>

                                    <p className="leading-snug">
                                        Please complete KYC
                                        verification to access
                                        developer tools.
                                    </p>

                                    <button
                                        onClick={() =>
                                            setActiveView(
                                                'KYC Status'
                                            )
                                        }
                                        className="mt-2 text-xs text-amber-800 underline font-semibold"
                                    >
                                        Verify Now →
                                    </button>
                                </div>
                            </div>
                        )}
                    </SidebarItem>


                    <SidebarItem
                        icon={Activity}
                        label="Activity Logs"
                        active={ACTIVITY_VIEWS.includes(activeView)}
                    >
                        <SubMenuItem
                            label="User Activity"
                            onClick={() => setActiveView('User Activity')}
                            isActive={activeView === 'User Activity'}
                        />
                        <SubMenuItem
                            label="API Activity"
                            onClick={() => setActiveView('API Activity')}
                            isActive={activeView === 'API Activity'}
                        />
                        <SubMenuItem
                            label="Login History"
                            onClick={() => setActiveView('Login History')}
                            isActive={activeView === 'Login History'}
                        />
                        <SubMenuItem
                            label="IP Logs"
                            onClick={() => setActiveView('IP Logs')}
                            isActive={activeView === 'IP Logs'}
                        />
                    </SidebarItem>


                    <SidebarItem
                        icon={FileText}
                        label="Reports"
                        active={REPORT_VIEWS.includes(activeView)}
                    >
                        <SubMenuItem
                            label="Transaction Reports"
                            onClick={() => setActiveView('Transaction Reports')}
                            isActive={activeView === 'Transaction Reports'}
                        />
                        <SubMenuItem
                            label="Wallet Reports"
                            onClick={() => setActiveView('Wallet Reports')}
                            isActive={activeView === 'Wallet Reports'}
                        />
                        <SubMenuItem
                            label="API Usage Reports"
                            onClick={() => setActiveView('API Usage Reports')}
                            isActive={activeView === 'API Usage Reports'}
                        />
                        <SubMenuItem
                            label="Export CSV / PDF"
                            onClick={() => setActiveView('Export CSV / PDF')}
                            isActive={activeView === 'Export CSV / PDF'}
                        />
                    </SidebarItem>


                    <SidebarItem
                        icon={Shield}
                        label="Security"
                    >
                        <SubMenuItem label="Change Password" />
                        <SubMenuItem label="2FA" />
                        <SubMenuItem label="Active Sessions" />
                        <SubMenuItem label="IP Whitelist" />
                    </SidebarItem>


                    <SidebarItem
                        icon={User}
                        label="Account"
                        active={[
                            'Profile Settings',
                            'KYC Status',
                        ].includes(activeView)}
                    >
                        <SubMenuItem
                            label="Profile Settings"
                            onClick={() =>
                                setActiveView(
                                    'Profile Settings'
                                )
                            }
                            isActive={
                                activeView ===
                                'Profile Settings'
                            }
                        />

                        <SubMenuItem
                            label="KYC Status"
                            onClick={() =>
                                setActiveView('KYC Status')
                            }
                            isActive={
                                activeView ===
                                'KYC Status'
                            }
                        />
                    </SidebarItem>


                    <div className="pt-2">

                        <SidebarItem
                            icon={HelpCircle}
                            label="Support"
                            active={[
                                'Raise Ticket',
                                'Ticket History',
                                'API Docs',
                                'Contact Us',
                            ].includes(activeView)}
                        >
                            <SubMenuItem
                                label="Raise Ticket"
                                onClick={() =>
                                    setActiveView(
                                        'Raise Ticket'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'Raise Ticket'
                                }
                            />

                            <SubMenuItem
                                label="Ticket History"
                                onClick={() =>
                                    setActiveView(
                                        'Ticket History'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'Ticket History'
                                }
                            />

                            <SubMenuItem
                                label="API Docs"
                                onClick={() =>
                                    setActiveView(
                                        'API Documentation'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'API Documentation'
                                }
                            />

                            <SubMenuItem
                                label="Contact Us"
                                onClick={() =>
                                    setActiveView(
                                        'Contact Us'
                                    )
                                }
                                isActive={
                                    activeView ===
                                    'Contact Us'
                                }
                            />
                        </SidebarItem>

                    </div>


                    <SidebarItem
                        icon={Clock}
                        label="Recent Activity"
                        active={activeView === 'Recent Activity'}
                        onClick={() => setActiveView('Recent Activity')}
                    />

                </div>


                <div className="px-3 py-4 border-t border-gray-100">

                    <div
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={20} />

                        <span className="text-sm font-medium">
                            Log Out
                        </span>
                    </div>

                </div>

            </aside>


            {/* ==================================================
                MAIN CONTENT
            ================================================== */}

            <main className="flex-1 lg:ml-64 flex flex-col h-full overflow-hidden transition-all duration-300">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0 shrink-0">

                    <div className="flex items-center gap-4 w-full max-w-xl">

                        <button
                            onClick={() =>
                                setIsSidebarOpen(true)
                            }
                            className="lg:hidden text-gray-500 hover:text-gray-700"
                        >
                            <Menu className="w-6 h-6" />
                        </button>


                        <div className="relative flex-1 max-w-md hidden sm:block">

                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

                            <input
                                type="text"
                                placeholder="Search transaction ID, beneficiary, or status..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all"
                                value={searchTerm}
                                onChange={(e) =>
                                    setSearchTerm(
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                    </div>


                    <div className="flex items-center gap-4 sm:gap-6">

                        <button
                            onClick={() =>
                                setActiveView('Add Funds')
                            }
                            className="hidden sm:flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Funds</span>
                        </button>


                        <div className="relative cursor-pointer">
                            <Bell className="w-5 h-5 text-gray-500 hover:text-gray-700" />

                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                        </div>


                        <div className="flex items-center gap-3 cursor-pointer pl-4 sm:pl-6 border-l border-gray-200">

                            <div className="text-right hidden sm:block">

                                <p className="text-sm font-semibold text-gray-900 leading-none">
                                    {profileData
                                        ? `${profileData.first_name} ${profileData.last_name}`
                                        : `${user?.firstName || ''} ${user?.lastName || ''}`}
                                </p>

                                <p
                                    className={`text-xs mt-1 flex items-center justify-end gap-1 ${kycDisplay.cls}`}
                                >
                                    {kycDisplay.icon}
                                    {kycDisplay.label}
                                </p>

                            </div>


                            <img
                                src={`https://ui-avatars.com/api/?name=${profileData?.first_name ?? user?.firstName}+${profileData?.last_name ?? user?.lastName}&background=random`}
                                alt="Profile"
                                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                            />

                        </div>

                    </div>

                </header>


                {/* ==================================================
                    SCROLLABLE CONTENT
                ================================================== */}

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">

                    {/* ==================================================
                        OTHER PAGES
                    ================================================== */}

                    {/* activeView === 'Quick Stats' ? (
                        <div className="max-w-7xl mx-auto">
                            <QuickStats />
                        </div>

                    ) : */ activeView === 'Recent Activity' ? (
                        <div className="max-w-7xl mx-auto">
                            <RecentActivity />
                        </div>

                    ) : WALLET_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Wallet view={activeView} onNavigate={setActiveView} />
                        </div>

                    ) : PAYOUT_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Payouts view={activeView} onNavigate={setActiveView} />
                        </div>

                    ) : ANALYTICS_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Analytics view={activeView} />
                        </div>

                    ) : DEVELOPER_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Developers
                                view={activeView}
                                onNavigate={setActiveView}
                                kycVerified={kycIsVerified}
                            />
                        </div>

                    ) : ACTIVITY_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <ActivityLogs view={activeView} onNavigate={setActiveView} />
                        </div>

                    ) : REPORT_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Reports view={activeView} />
                        </div>

                    ) : SECURITY_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Security view={activeView} />
                        </div>

                    ) : ACCOUNT_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Account view={activeView} onNavigate={setActiveView} onProfileUpdated={setProfileData} />
                        </div>

                    ) : SUPPORT_VIEWS.includes(activeView) ? (
                        <div className="max-w-7xl mx-auto">
                            <Support view={activeView} onNavigate={setActiveView} />
                        </div>

                    ) : (

                        /* ==================================================
                           NEW DASHBOARD OVERVIEW
                        ================================================== */

                        <div className="max-w-7xl mx-auto space-y-6">

                            {/* ==================================================
                                WELCOME HEADER
                            ================================================== */}

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                        Good Morning,{' '}
                                        {profileData?.first_name ||
                                            user?.firstName ||
                                            'Merchant'}{' '}
                                        👋
                                    </h1>

                                    <p className="text-sm text-gray-500 mt-1">
                                        Here's what's happening
                                        with your account today.
                                    </p>
                                </div>


                                <div className="flex items-center gap-2">

                                    <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                                        <CalendarDays className="w-4 h-4" />
                                        Today
                                        <ChevronDown className="w-4 h-4" />
                                    </button>


                                    <button
                                        onClick={() =>
                                            window.location.reload()
                                        }
                                        className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>

                                </div>

                            </div>


                            {/* ==================================================
                                1. SIX TOP CARDS
                            ================================================== */}

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

                                <StatCard
                                    title="Available Balance"
                                    value={formatCurrency(
                                        availableBalance
                                    )}
                                    subtext="Current virtual balance"
                                    icon={WalletIcon}
                                    iconBg="bg-blue-50"
                                    iconColor="text-blue-600"
                                />


                                <StatCard
                                    title="Locked Balance"
                                    value={formatCurrency(
                                        lockedBalance
                                    )}
                                    subtext="Currently reserved"
                                    icon={Lock}
                                    iconBg="bg-purple-50"
                                    iconColor="text-purple-600"
                                />


                                <StatCard
                                    title="Total Payout Sent"
                                    value={formatCurrency(
                                        totalPayoutSent
                                    )}
                                    subtext="Lifetime payout volume"
                                    icon={TrendingUp}
                                    iconBg="bg-green-50"
                                    iconColor="text-green-600"
                                />


                                <StatCard
                                    title="Total Failed"
                                    value={formatCurrency(
                                        totalFailed
                                    )}
                                    subtext="Failed payout amount"
                                    icon={AlertTriangle}
                                    iconBg="bg-red-50"
                                    iconColor="text-red-600"
                                    valueColor="text-gray-900"
                                />


                                <StatCard
                                    title="API Requests"
                                    value={Number(apiRequests || 0).toLocaleString(
                                        'en-IN'
                                    )}
                                    subtext="Requests today"
                                    icon={ServerIcon}
                                    iconBg="bg-blue-50"
                                    iconColor="text-blue-600"
                                />


                                <StatCard
                                    title="Success Rate"
                                    value={`${successRate}%`}
                                    subtext="Current payout success"
                                    icon={Activity}
                                    iconBg="bg-green-50"
                                    iconColor="text-green-600"
                                />

                            </div>





                            {/* ==================================================
                                3. TRANSACTION ANALYTICS
                            ================================================== */}

                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">
                                            Transaction Analytics
                                        </h2>

                                        <p className="text-xs text-gray-400 mt-1">
                                            Payout volume over time
                                        </p>
                                    </div>


                                    <div className="flex items-center bg-gray-50 rounded-lg p-1">

                                        {[
                                            '7 Days',
                                            '30 Days',
                                            '3 Months',
                                        ].map((range) => (
                                            <button
                                                key={range}
                                                onClick={() =>
                                                    setAnalyticsRange(
                                                        range
                                                    )
                                                }
                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${analyticsRange ===
                                                    range
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-800'
                                                    }`}
                                            >
                                                {range}
                                            </button>
                                        ))}

                                    </div>

                                </div>


                                <div className="h-72">

                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >

                                        <AreaChart
                                            data={weeklyData}
                                        >

                                            <defs>
                                                <linearGradient
                                                    id="bluePayAmount"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="#3B82F6"
                                                        stopOpacity={
                                                            0.18
                                                        }
                                                    />

                                                    <stop
                                                        offset="95%"
                                                        stopColor="#3B82F6"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>


                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                                stroke="#E5E7EB"
                                            />


                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{
                                                    fill: '#6B7280',
                                                    fontSize: 12,
                                                }}
                                            />


                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{
                                                    fill: '#6B7280',
                                                    fontSize: 12,
                                                }}
                                            />


                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '10px',
                                                    border: '1px solid #E5E7EB',
                                                    boxShadow:
                                                        '0 8px 20px rgba(0,0,0,0.08)',
                                                }}
                                                formatter={(value) => [
                                                    formatCurrency(
                                                        value
                                                    ),
                                                    'Payout',
                                                ]}
                                            />


                                            <Area
                                                type="monotone"
                                                dataKey="amount"
                                                stroke="#2563EB"
                                                strokeWidth={3}
                                                fill="url(#bluePayAmount)"
                                                activeDot={{
                                                    r: 6,
                                                }}
                                            />

                                        </AreaChart>

                                    </ResponsiveContainer>

                                </div>

                            </div>


                            {/* ==================================================
                                4. RECENT TRANSACTIONS + WALLET
                            ================================================== */}

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                                {/* Recent Transactions */}

                                <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

                                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">

                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">
                                                Recent Transactions
                                            </h2>

                                            <p className="text-xs text-gray-400 mt-1">
                                                Latest payout activity
                                            </p>
                                        </div>


                                        <button
                                            onClick={() =>
                                                setActiveView(
                                                    'Wallet Overview'
                                                )
                                            }
                                            className="text-blue-600 text-sm font-semibold hover:text-blue-700"
                                        >
                                            View All →
                                        </button>

                                    </div>


                                    <div className="overflow-x-auto">

                                        {filteredPayouts.length > 0 ? (

                                            <table className="w-full text-sm">

                                                <thead className="bg-gray-50">

                                                    <tr className="text-left text-xs text-gray-500">

                                                        <th className="px-5 py-3 font-semibold">
                                                            ID
                                                        </th>

                                                        <th className="px-5 py-3 font-semibold">
                                                            Type
                                                        </th>

                                                        <th className="px-5 py-3 font-semibold">
                                                            Amount
                                                        </th>

                                                        <th className="px-5 py-3 font-semibold">
                                                            Status
                                                        </th>

                                                        <th className="px-5 py-3 font-semibold">
                                                            Date & Time
                                                        </th>

                                                    </tr>

                                                </thead>


                                                <tbody className="divide-y divide-gray-100">

                                                    {filteredPayouts
                                                        .slice(0, 6)
                                                        .map(
                                                            (
                                                                payout
                                                            ) => (

                                                                <tr
                                                                    key={
                                                                        payout._id
                                                                    }
                                                                    className="hover:bg-gray-50 transition"
                                                                >

                                                                    <td className="px-5 py-4">

                                                                        <span className="font-mono text-xs font-semibold text-blue-600">
                                                                            BP
                                                                            {payout._id
                                                                                ?.toString()
                                                                                .slice(
                                                                                    -6
                                                                                )
                                                                                .toUpperCase()}
                                                                        </span>

                                                                    </td>


                                                                    <td className="px-5 py-4">

                                                                        <div className="flex items-center gap-2">

                                                                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                                                                                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                                                                            </div>

                                                                            <span className="font-medium text-gray-700">
                                                                                Payout
                                                                            </span>

                                                                        </div>

                                                                    </td>


                                                                    <td className="px-5 py-4 font-semibold text-gray-900">
                                                                        {formatCurrency(
                                                                            payout.amount
                                                                        )}
                                                                    </td>


                                                                    <td className="px-5 py-4">
                                                                        <StatusBadge
                                                                            status={
                                                                                payout.status
                                                                            }
                                                                        />
                                                                    </td>


                                                                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                                                                        {formatDate(
                                                                            payout.createdAt
                                                                        )}
                                                                    </td>

                                                                </tr>

                                                            )
                                                        )}

                                                </tbody>

                                            </table>

                                        ) : (

                                            <div className="py-14 text-center">

                                                <div className="w-12 h-12 mx-auto rounded-full bg-gray-50 flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-gray-300" />
                                                </div>

                                                <p className="text-sm font-semibold text-gray-600 mt-3">
                                                    No transactions yet
                                                </p>

                                                <p className="text-xs text-gray-400 mt-1">
                                                    Your payout transactions
                                                    will appear here.
                                                </p>

                                            </div>

                                        )}

                                    </div>

                                </div>


                                {/* Wallet Overview */}

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

                                    <div className="flex items-center justify-between">

                                        <div className="flex items-center gap-2">

                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <WalletIcon className="w-5 h-5 text-blue-600" />
                                            </div>

                                            <h2 className="text-lg font-bold text-gray-900">
                                                Wallet Overview
                                            </h2>

                                        </div>


                                        <button
                                            onClick={() =>
                                                setActiveView(
                                                    'Wallet Overview'
                                                )
                                            }
                                            className="text-blue-600 text-xs font-semibold"
                                        >
                                            View History →
                                        </button>

                                    </div>


                                    <div className="mt-6">

                                        <p className="text-xs text-gray-400">
                                            Current Virtual Balance
                                        </p>

                                        <p className="text-3xl font-bold text-gray-900 mt-1">
                                            {formatCurrency(
                                                availableBalance
                                            )}
                                        </p>

                                    </div>


                                    <div className="grid grid-cols-2 gap-3 mt-6">

                                        <div className="p-3 rounded-lg bg-green-50 border border-green-100">

                                            <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                                Credits
                                            </div>

                                            <p className="text-lg font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    walletSummary.monthCredits
                                                )}
                                            </p>

                                        </div>


                                        <div className="p-3 rounded-lg bg-red-50 border border-red-100">

                                            <div className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                                                <ArrowDownRight className="w-3.5 h-3.5" />
                                                Debits
                                            </div>

                                            <p className="text-lg font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    walletSummary.monthDebits
                                                )}
                                            </p>

                                        </div>

                                    </div>


                                    <div className="grid grid-cols-2 gap-3 mt-3">

                                        <div className="p-3 bg-gray-50 rounded-lg">

                                            <p className="text-xs text-gray-500">
                                                Pending Requests
                                            </p>

                                            <p className="font-bold text-gray-900 mt-1">
                                                {walletSummary.pendingRequestsCount ||
                                                    0}
                                            </p>

                                        </div>


                                        <div className="p-3 bg-gray-50 rounded-lg">

                                            <p className="text-xs text-gray-500">
                                                Locked
                                            </p>

                                            <p className="font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    lockedBalance
                                                )}
                                            </p>

                                        </div>

                                    </div>


                                    <div className="mt-5 flex gap-2">

                                        <button
                                            onClick={() =>
                                                setActiveView(
                                                    'Add Funds'
                                                )
                                            }
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Funds
                                        </button>


                                        <button
                                            onClick={() =>
                                                setActiveView(
                                                    'Wallet Overview'
                                                )
                                            }
                                            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50"
                                        >
                                            View Transactions
                                        </button>

                                    </div>

                                </div>

                            </div>


                            {/* ==================================================
                                5. PAYOUT ANALYTICS + ACCOUNT STATUS
                            ================================================== */}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* Payout Analytics */}

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">

                                    <div className="flex items-center justify-between mb-5">

                                        <div className="flex items-center gap-2">

                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                            </div>

                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">
                                                    Payout Analytics
                                                </h2>

                                                <p className="text-xs text-gray-400">
                                                    Current payout performance
                                                </p>
                                            </div>

                                        </div>


                                        <button
                                            onClick={() =>
                                                setActiveView(
                                                    'Payout Analytics'
                                                )
                                            }
                                            className="text-blue-600 text-xs font-semibold"
                                        >
                                            View Details →
                                        </button>

                                    </div>


                                    <div className="grid grid-cols-3 gap-4">

                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Total Payouts
                                            </p>

                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    totalPayoutSent
                                                )}
                                            </p>
                                        </div>


                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Successful
                                            </p>

                                            <p className="text-xl font-bold text-green-600 mt-1">
                                                {formatCurrency(
                                                    totalPayoutSent -
                                                    totalFailed
                                                )}
                                            </p>
                                        </div>


                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Failed
                                            </p>

                                            <p className="text-xl font-bold text-red-600 mt-1">
                                                {formatCurrency(
                                                    totalFailed
                                                )}
                                            </p>
                                        </div>

                                    </div>


                                    <div className="mt-7 flex items-center gap-6">

                                        <div className="w-32 h-32">

                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >

                                                <RePieChart>

                                                    <Pie
                                                        data={[
                                                            {
                                                                name: 'Success',
                                                                value:
                                                                    successRate,
                                                            },
                                                            {
                                                                name: 'Other',
                                                                value:
                                                                    Math.max(
                                                                        0,
                                                                        100 -
                                                                        successRate
                                                                    ),
                                                            },
                                                        ]}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={42}
                                                        outerRadius={58}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >

                                                        <Cell fill="#10B981" />

                                                        <Cell fill="#E5E7EB" />

                                                    </Pie>

                                                </RePieChart>

                                            </ResponsiveContainer>

                                        </div>


                                        <div>

                                            <p className="text-3xl font-bold text-gray-900">
                                                {successRate}%
                                            </p>

                                            <p className="text-sm text-gray-500 mt-1">
                                                Success Rate
                                            </p>

                                            <div className="flex items-center gap-2 mt-3">

                                                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />

                                                <span className="text-xs text-gray-500">
                                                    Successful transactions
                                                </span>

                                            </div>

                                            <div className="flex items-center gap-2 mt-2">

                                                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />

                                                <span className="text-xs text-gray-500">
                                                    Other transactions
                                                </span>

                                            </div>

                                        </div>

                                    </div>

                                </div>


                                {/* Account Status */}

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">

                                    <div className="flex items-center justify-between mb-5">

                                        <div className="flex items-center gap-2">

                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <Shield className="w-5 h-5 text-blue-600" />
                                            </div>

                                            <h2 className="text-lg font-bold text-gray-900">
                                                Account Status
                                            </h2>

                                        </div>


                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${kycIsVerified
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {kycIsVerified && (
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            )}

                                            {kycDisplay.label}
                                        </span>

                                    </div>


                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                                        <div className="p-4 bg-gray-50 rounded-lg">

                                            <p className="text-xs text-gray-500">
                                                KYC Status
                                            </p>

                                            <p
                                                className={`font-bold mt-1 ${kycIsVerified
                                                    ? 'text-green-600'
                                                    : 'text-gray-700'
                                                    }`}
                                            >
                                                {kycDisplay.label}
                                            </p>

                                        </div>


                                        <div className="p-4 bg-gray-50 rounded-lg">

                                            <p className="text-xs text-gray-500">
                                                Account Type
                                            </p>

                                            <p className="font-bold text-gray-900 mt-1 capitalize">
                                                {profileData?.accountType ||
                                                    dashboardData
                                                        ?.user
                                                        ?.accountType ||
                                                    'Corporate'}
                                            </p>

                                        </div>


                                        <div className="p-4 bg-gray-50 rounded-lg">

                                            <p className="text-xs text-gray-500">
                                                Domain
                                            </p>

                                            {(profileData?.domain ||
                                                dashboardData
                                                    ?.user
                                                    ?.domain) ? (
                                                <p className="font-semibold text-blue-600 text-sm mt-1 truncate">
                                                    {profileData?.domain ||
                                                        dashboardData
                                                            ?.user
                                                            ?.domain}
                                                </p>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        setDomainModal(
                                                            true
                                                        )
                                                    }
                                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold mt-1 hover:bg-blue-700"
                                                >
                                                    + Add Domain
                                                </button>
                                            )}

                                        </div>

                                    </div>


                                    <div className="mt-5 pt-5 border-t border-gray-100">

                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            Submitted Details
                                        </p>


                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    GSTIN
                                                </p>

                                                <p className="text-sm font-semibold text-gray-800 mt-1">
                                                    {profileData?.gst_number ||
                                                        '—'}
                                                </p>
                                            </div>


                                            <div>
                                                <p className="text-xs text-gray-500">
                                                    PAN
                                                </p>

                                                <p className="text-sm font-semibold text-gray-800 mt-1">
                                                    {profileData?.pan_number ||
                                                        '—'}
                                                </p>
                                            </div>

                                        </div>

                                    </div>

                                </div>


                                {/* ==================================================
                                2. TODAY'S TRANSACTIONS
                            ================================================== */}

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">

                                    <div className="flex items-center justify-between mb-5">

                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">
                                                Today's Transactions
                                            </h2>

                                            <p className="text-xs text-gray-400 mt-1">
                                                Today's payout activity
                                            </p>
                                        </div>

                                    </div>


                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                                        <div className="border-r border-gray-100 last:border-0 pr-4">

                                            <p className="text-sm text-gray-500">
                                                Total Volume
                                            </p>

                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    todayTotalAmount
                                                )}
                                            </p>

                                            <p className="text-xs text-gray-400 mt-2">
                                                {todayPayouts.length}{' '}
                                                Transactions
                                            </p>

                                        </div>


                                        <div className="border-r border-gray-100 pr-4">

                                            <p className="text-sm text-gray-500">
                                                Successful
                                            </p>

                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    todaySuccessfulAmount
                                                )}
                                            </p>

                                            <p className="text-xs text-green-600 mt-2">
                                                {todaySuccessful.length}{' '}
                                                Transactions
                                            </p>

                                        </div>


                                        <div className="border-r border-gray-100 pr-4">

                                            <p className="text-sm text-gray-500">
                                                Pending
                                            </p>

                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    todayPendingAmount
                                                )}
                                            </p>

                                            <p className="text-xs text-orange-600 mt-2">
                                                {todayPending.length}{' '}
                                                Transactions
                                            </p>

                                        </div>


                                        <div>

                                            <p className="text-sm text-gray-500">
                                                Failed
                                            </p>

                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                {formatCurrency(
                                                    todayFailedAmount
                                                )}
                                            </p>

                                            <p className="text-xs text-red-600 mt-2">
                                                {todayFailed.length}{' '}
                                                Transactions
                                            </p>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>
                    )}

                </div>

            </main>


            {/* ==================================================
                DOMAIN MODAL
            ================================================== */}

            {domainModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

                        <div className="flex items-center gap-3 mb-5">

                            <div className="p-2.5 bg-blue-50 rounded-xl">
                                <Globe className="w-5 h-5 text-blue-600" />
                            </div>

                            <div>
                                <p className="font-black text-gray-900">
                                    Add Domain
                                </p>

                                <p className="text-xs text-gray-400">
                                    Enter your business domain
                                    (e.g. yoursite.com)
                                </p>
                            </div>

                        </div>


                        <input
                            value={domainInput}
                            onChange={(e) =>
                                setDomainInput(
                                    e.target.value
                                )
                            }
                            onKeyDown={(e) =>
                                e.key === 'Enter' &&
                                handleSaveDomain()
                            }
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5"
                            placeholder="e.g. yourbusiness.com"
                            autoFocus
                        />


                        <div className="flex gap-3">

                            <button
                                onClick={() => {
                                    setDomainModal(false);
                                    setDomainInput('');
                                }}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>


                            <button
                                onClick={handleSaveDomain}
                                disabled={
                                    !domainInput.trim() ||
                                    domainSaving
                                }
                                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                                {domainSaving ? (
                                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                                ) : null}

                                Save Domain
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
};


// ------------------------------------------------------------
// Small helper icon component
// ------------------------------------------------------------

const ServerIcon = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="3" width="18" height="7" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
        <line x1="7" y1="18" x2="7.01" y2="18" />
    </svg>
);


export default Dashboard;