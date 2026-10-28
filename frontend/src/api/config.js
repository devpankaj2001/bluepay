const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// .env should define VITE_API_URL as the bare host (no /api) - VITE_API_BASE_URL
// is kept only as a fallback alias for anyone who already set that name locally.
// The trailing-slash/trailing-/api strip below is defensive: if either env var
// is ever misconfigured to already include /api, appending /api again below
// would otherwise silently produce /api/api/... on every request.
const rawApiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
const configuredApiBase = rawApiBase ? rawApiBase.replace(/\/+$/, '').replace(/\/api$/i, '') : '';

export const API_BASE = isLocalhost
    ? (configuredApiBase || 'http://localhost:1977')
    : (configuredApiBase || 'https://api.bluepay.co.in');

// /api is appended exactly once here - callers must never prefix their own
// request paths with /api, or requests become /api/api/...
export const API_BASE_URL = `${API_BASE}/api`;

export const TIMEOUT = 15000;
export const RETRY_COUNT = 2;

