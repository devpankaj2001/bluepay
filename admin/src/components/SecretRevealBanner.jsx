import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Check, X } from 'lucide-react';

// A secret is shown in full exactly once (right after create/regenerate,
// straight from that API response) and is never fetchable again - list/get
// endpoints only ever return a masked form. This banner is that one-time
// display, with copy-to-clipboard so the admin doesn't need to select text.
const SecretRevealBanner = ({ secret, label = 'signing secret', onDismiss }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy - please copy manually');
        }
    };
    return (
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-amber-800 mb-1">Save this {label} now</div>
                    <div className="text-xs text-amber-700 mb-2">It will not be shown again. If lost, it must be regenerated.</div>
                    <code className="block bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono break-all text-gray-800">{secret}</code>
                </div>
                <button onClick={onDismiss} className="shrink-0 text-amber-500 hover:text-amber-700"><X className="w-4 h-4" /></button>
            </div>
            <button onClick={copy} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:underline">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy secret'}
            </button>
        </div>
    );
};

export default SecretRevealBanner;
