import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';

const TopNav = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const currentPage = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path));

    return (
        <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-3">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-lg flex items-center justify-center transform -skew-x-6 text-white font-black text-xl overflow-hidden relative">
                        {/* the diagonal slash effect */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-1.5 bg-white transform -translate-x-1/2 -skew-x-12 opacity-90"></div>
                        <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-amber-500 transform -translate-x-1/2 skew-x-12 opacity-20"></div>
                    </div>
                    <span className="text-2xl font-semibold tracking-tight text-gray-900">bluepay</span>
                </div>
                {currentPage && (
                    <>
                        <span className="text-gray-300">/</span>
                        <span className="text-sm font-medium text-gray-500">{currentPage.name}</span>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default TopNav;
