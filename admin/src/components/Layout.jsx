import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const Layout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem('adminSidebarCollapsed') === '1';
        } catch {
            return false;
        }
    });

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('adminSidebarCollapsed', next ? '1' : '0');
            } catch {
                // ignore storage errors (private browsing, quota, etc.)
            }
            return next;
        });
    };

    // Sidebar is always icon-only on small screens; the collapse toggle
    // only affects md+ widths. Content margin must track the same rule so
    // the two never fall out of sync.
    const contentMargin = collapsed ? 'ml-20' : 'ml-20 md:ml-64';

    return (
        <div className="min-h-screen bg-neutral-200 flex h-screen overflow-hidden">
            <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
            {/* Main Application Window */}
            <div className={`flex-1 min-w-0 ${contentMargin} p-3 md:p-6 pb-0 md:pb-0 flex flex-col overflow-hidden transition-all duration-200`}>
                <div className="flex-1 bg-white md:rounded-t-[2.5rem] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative border border-gray-100">
                    <TopNav />
                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-12">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
