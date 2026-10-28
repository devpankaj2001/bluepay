import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    UsersRound,
    ShieldCheck,
    ArrowDownLeft,
    CreditCard,
    ArrowRightLeft,
    Wallet,
    BarChart3,
    Activity,
    Webhook,
    KeyRound,
    BookOpen,
    ScrollText,
    LifeBuoy,
    Settings,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';

const NAV_ITEMS = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Users / Merchants', path: '/users', icon: UsersRound },
    { name: 'KYC', path: '/kyc', icon: ShieldCheck },
    { name: 'Fund Requests', path: '/fund-requests', icon: ArrowDownLeft },
    { name: 'Payouts', path: '/payouts', icon: CreditCard },
    { name: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
    { name: 'Wallets', path: '/wallets', icon: Wallet },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'API Usage', path: '/api-usage', icon: Activity },
    { name: 'API Partner Reference', path: '/api-partner-reference', icon: BookOpen },
    { name: 'Webhooks', path: '/webhooks', icon: Webhook },
    { name: 'Developer / API Credentials', path: '/developers', icon: KeyRound },
    { name: 'Activity Logs', path: '/activity-logs', icon: ScrollText },
    { name: 'Support', path: '/support', icon: LifeBuoy },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'App Settings', path: '/app-settings', icon: KeyRound },
];

const Sidebar = ({ collapsed, onToggle }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div
            className={`h-screen ${collapsed ? 'w-20' : 'w-20 md:w-64'} bg-gray-900 text-white flex flex-col fixed left-0 top-0 overflow-y-auto overflow-x-hidden transition-all duration-200 z-20`}
        >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                {!collapsed && (
                    <h1 className="hidden md:block text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 whitespace-nowrap">
                        BluePay Admin
                    </h1>
                )}
                <button
                    type="button"
                    onClick={onToggle}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="hidden md:inline-flex p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors shrink-0"
                >
                    {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        title={item.name}
                        className={({ isActive }) =>
                            `flex items-center ${collapsed ? 'justify-center' : 'justify-center md:justify-start'} px-3 py-2.5 rounded-lg transition-colors duration-200 ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="hidden md:inline font-medium ml-3 text-sm whitespace-nowrap">{item.name}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="p-3 border-t border-gray-800">
                <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className={`flex items-center w-full px-3 py-2.5 text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-lg transition-colors duration-200 ${collapsed ? 'justify-center' : 'justify-center md:justify-start'}`}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="hidden md:inline font-medium ml-3 text-sm">Sign Out</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
export { NAV_ITEMS };
