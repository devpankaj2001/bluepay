import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Shown for sidebar modules whose backend only exposes merchant-scoped,
// self-service endpoints (protected by `auth`, not `isAdmin`). There is no
// admin-wide listing API for these yet, so rendering real data here would
// mean either faking it or silently showing the superadmin's own (empty)
// record - both are misleading. This says so plainly instead.
const ComingSoonNotice = ({ title, endpointsChecked }) => (
    <div className="bg-white border border-dashed border-amber-300 rounded-2xl p-10 text-center max-w-xl mx-auto mt-16">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title} isn't wired up yet</h2>
        <p className="text-sm text-gray-500 mt-2">
            The backend only exposes merchant-scoped self-service endpoints for this module
            ({endpointsChecked}), guarded by <code className="px-1 bg-gray-100 rounded">auth</code> rather
            than <code className="px-1 bg-gray-100 rounded">isAdmin</code>. There is no admin-wide listing
            API yet, so this page can't safely show real platform data without a backend change.
        </p>
        <p className="text-xs text-gray-400 mt-4">Ask backend to add an admin-scoped endpoint for this module to enable it here.</p>
    </div>
);

export default ComingSoonNotice;
