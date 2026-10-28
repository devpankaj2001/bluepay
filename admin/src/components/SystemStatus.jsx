import { useState, useEffect } from 'react';

const SystemStatus = () => {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const handleOffline = () => setStatus('offline');
        const handleOnline = () => setStatus(null);
        const handleMaintenance = () => setStatus('maintenance');
        const handleServerDown = () => setStatus('server_down');
        const handleRateLimit = () => setStatus('rate_limit');

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        window.addEventListener('maintenance_mode', handleMaintenance);
        window.addEventListener('server_down', handleServerDown);
        window.addEventListener('rate_limit', handleRateLimit);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('maintenance_mode', handleMaintenance);
            window.removeEventListener('server_down', handleServerDown);
            window.removeEventListener('rate_limit', handleRateLimit);
        };
    }, []);

    if (!status) return null;

    const content = {
        offline: {
            title: 'No Internet Connection',
            message: 'Please check your network settings.',
            color: 'bg-gray-800',
            icon: '📡'
        },
        maintenance: {
            title: 'System Maintenance',
            message: 'We are currently upgrading our system. Please try again later.',
            color: 'bg-yellow-600',
            icon: '⚠️'
        },
        server_down: {
            title: 'Server Error',
            message: 'Our servers are experiencing issues. We are working on it.',
            color: 'bg-red-600',
            icon: '🔥'
        },
        rate_limit: {
            title: 'Too Many Requests',
            message: 'You are making requests too quickly. Please slow down.',
            color: 'bg-orange-500',
            icon: '✋'
        }
    };

    const current = content[status];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className={`${current.color} text-white p-8 rounded-2xl shadow-2xl max-w-md text-center border border-white/20 transform animate-bounce-in`}>
                <div className="text-6xl mb-4">{current.icon}</div>
                <h2 className="text-2xl font-bold mb-2">{current.title}</h2>
                <p className="opacity-90">{current.message}</p>
                <button
                    onClick={() => setStatus(null)}
                    className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
};

export default SystemStatus;
