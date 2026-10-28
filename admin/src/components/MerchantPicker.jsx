import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/apiClient';
import { Search } from 'lucide-react';

// Shared merchant search/select control used by admin pages that manage a
// specific merchant's resources (webhooks, developer credentials, ...).
// Reuses the existing admin GET /users search/pagination instead of
// loading the full merchant list into the browser.
const MerchantPicker = ({ selected, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await apiClient.get('/users', { params: { search: query.trim(), limit: 10 } });
                setResults(res.data.users || []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    return (
        <div className="relative">
            <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    value={selected ? `${selected.company_name || `${selected.first_name} ${selected.last_name}`} (${selected.email})` : query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); if (selected) onSelect(null); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search merchant by name, email, mobile, company..."
                    className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm w-96 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
            </div>
            {open && query.trim() && !selected && (
                <div className="absolute z-10 mt-1 w-96 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-sm text-gray-400">Searching...</div>
                    ) : results.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400">No merchants found</div>
                    ) : results.map((u) => (
                        <button
                            key={u._id}
                            type="button"
                            onClick={() => { onSelect(u); setOpen(false); setQuery(''); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                            <div className="text-sm font-medium text-gray-900">{u.company_name || `${u.first_name} ${u.last_name}`}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MerchantPicker;
