import React from 'react';

// Generic confirm-before-destructive-or-sensitive-action modal, shared by
// admin pages (regenerate secret, revoke credential, delete endpoint, ...).
const ConfirmModal = ({ title, message, confirmLabel, danger, loading, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
                <button onClick={onCancel} disabled={loading} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {loading ? 'Please wait...' : confirmLabel}
                </button>
            </div>
        </div>
    </div>
);

export default ConfirmModal;
