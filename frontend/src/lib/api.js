"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiBaseUrl = getApiBaseUrl;
exports.transformError = transformError;
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("@/store/auth");
// ─── Base Instance ─────────────────────────────────────────────────────────────
const RAW_PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
function isLocalUrl(url) {
    if (!url)
        return false;
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(url);
}
function getApiBaseUrl() {
    if (typeof window !== 'undefined') {
        const pageHost = window.location.hostname.toLowerCase();
        const isBrowserLocal = pageHost === 'localhost' || pageHost === '127.0.0.1';
        if (!isBrowserLocal) {
            // Production browser: never try to reach the visitor's own localhost:5000.
            // Use configured production NEXT_PUBLIC_API_URL, or fall back cleanly to same-origin /api/proxy.
            if (RAW_PUBLIC_API_URL && !isLocalUrl(RAW_PUBLIC_API_URL)) {
                return RAW_PUBLIC_API_URL;
            }
            return '/api/proxy';
        }
    }
    return RAW_PUBLIC_API_URL || 'http://localhost:5000';
}
const api = axios_1.default.create({
    baseURL: getApiBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
    timeout: 45000,
});
function readStoredAuth() {
    if (typeof window === 'undefined')
        return { accessToken: null, refreshToken: null };
    const mem = auth_1.useAuthStore.getState();
    try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
            const parsed = JSON.parse(raw);
            const st = parsed?.state;
            if (st?.accessToken || st?.refreshToken) {
                return {
                    accessToken: st.accessToken ?? mem.accessToken ?? null,
                    refreshToken: st.refreshToken ?? mem.refreshToken ?? null,
                };
            }
        }
    }
    catch {
        /* ignore */
    }
    return {
        accessToken: mem.accessToken ?? null,
        refreshToken: mem.refreshToken ?? null,
    };
}
function decodeJwtExpiryMs(token) {
    if (!token || typeof window === 'undefined')
        return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(padded));
        return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
    }
    catch {
        return null;
    }
}
function isTokenExpiringSoon(token, bufferMs = 120_000) {
    const expMs = decodeJwtExpiryMs(token);
    if (!expMs)
        return false;
    return expMs - Date.now() <= bufferMs;
}
function isAuthEndpoint(url) {
    if (!url)
        return false;
    const lower = url.toLowerCase();
    return (lower.includes('/api/auth/login') ||
        lower.includes('/api/auth/register') ||
        lower.includes('/api/auth/refresh') ||
        lower.includes('/api/auth/logout'));
}
// Single-flight promise lock within current tab + Web Locks across tabs
let inFlightRefresh = null;
async function performSingleFlightRefresh(rejectedAccessToken) {
    if (typeof window === 'undefined')
        return null;
    if (inFlightRefresh)
        return inFlightRefresh;
    const runWithCrossTabLock = async () => {
        const executeRefresh = async () => {
            // Check if another tab already rotated tokens cleanly while we waited on the lock
            const latest = readStoredAuth();
            if (latest.accessToken &&
                rejectedAccessToken &&
                latest.accessToken !== rejectedAccessToken &&
                !isTokenExpiringSoon(latest.accessToken, 30_000)) {
                auth_1.useAuthStore.getState().setTokens(latest.accessToken, latest.refreshToken ?? '');
                return latest.accessToken;
            }
            if (latest.accessToken &&
                !rejectedAccessToken &&
                !isTokenExpiringSoon(latest.accessToken, 30_000)) {
                return latest.accessToken;
            }
            const refreshToken = latest.refreshToken;
            if (!refreshToken)
                return null;
            const base = getApiBaseUrl();
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const { data } = await axios_1.default.post(`${base}/api/auth/refresh`, { refreshToken }, { timeout: 30000 });
                    // Update Zustand state AND persisted storage atomically so updateUser() never overwrites fresh tokens
                    auth_1.useAuthStore.getState().setTokens(data.accessToken, data.refreshToken, data.user);
                    return data.accessToken;
                }
                catch (err) {
                    const axErr = err;
                    const code = axErr?.response?.status;
                    const isTransient = !axErr.response || axErr.code === 'ECONNABORTED' || code === 502 || code === 503 || code === 504;
                    if (isTransient && attempt < 2) {
                        await new Promise((r) => setTimeout(r, 1200));
                        continue;
                    }
                    // Clear client session strictly on authoritative 401/403 (revoked/expired refresh token)
                    if (code === 401 || code === 403) {
                        // Re-check localStorage once in case another tab completed a concurrent refresh right before our 401
                        const afterRace = readStoredAuth();
                        if (afterRace.refreshToken && afterRace.refreshToken !== refreshToken && afterRace.accessToken) {
                            auth_1.useAuthStore.getState().setTokens(afterRace.accessToken, afterRace.refreshToken);
                            return afterRace.accessToken;
                        }
                        auth_1.useAuthStore.getState().logout(true);
                        return null;
                    }
                    // Transient / 5xx backend sleep error: preserve session tokens so user isn't falsely logged out
                    return null;
                }
            }
            return null;
        };
        if (typeof navigator !== 'undefined' && navigator.locks?.request) {
            return navigator.locks.request('nexus-auth-refresh', executeRefresh);
        }
        return executeRefresh();
    };
    inFlightRefresh = runWithCrossTabLock().finally(() => {
        inFlightRefresh = null;
    });
    return inFlightRefresh;
}
// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
    config.baseURL = getApiBaseUrl();
    let { accessToken, refreshToken } = readStoredAuth();
    // Silently refresh expiring/expired access token BEFORE issuing authenticated calls to prevent 401 storms
    if (accessToken && refreshToken && !isAuthEndpoint(config.url) && isTokenExpiringSoon(accessToken, 120_000)) {
        const refreshed = await performSingleFlightRefresh(accessToken);
        if (refreshed) {
            accessToken = refreshed;
        }
    }
    if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
}, (error) => Promise.reject(error));
// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    // Automatic single retry for idempotent GET calls during cloud cold-starts (Render/Railway sleep wake)
    const method = (originalRequest?.method ?? 'get').toLowerCase();
    const status = error.response?.status;
    const isTransient = !error.response || error.code === 'ECONNABORTED' || status === 502 || status === 503 || status === 504;
    if (originalRequest && method === 'get' && isTransient && !originalRequest._coldStartRetried) {
        originalRequest._coldStartRetried = true;
        originalRequest.timeout = 60000;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return api(originalRequest);
    }
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
        originalRequest._retry = true;
        const sentAuth = String(originalRequest.headers?.Authorization ?? '');
        const sentToken = sentAuth.startsWith('Bearer ') ? sentAuth.slice(7) : null;
        const freshToken = await performSingleFlightRefresh(sentToken);
        if (freshToken) {
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${freshToken}`;
            }
            return api(originalRequest);
        }
    }
    return Promise.reject(transformError(error));
});
// ─── Error Transformer ────────────────────────────────────────────────────────
function transformError(error) {
    if (axios_1.default.isAxiosError(error)) {
        const data = error.response?.data;
        let msg = data?.message ?? data?.detail ?? data?.title ?? error.message ?? 'An unexpected error occurred';
        if (data?.errors && typeof data.errors === 'object') {
            const errList = Object.values(data.errors).flat().join(', ');
            if (errList)
                msg = errList;
        }
        if (!error.response && (msg === 'Network Error' || error.code === 'ECONNABORTED')) {
            const base = getApiBaseUrl();
            msg =
                base === '/api/proxy'
                    ? 'Unable to reach the backend API through proxy. Verify NEXT_PUBLIC_API_URL or API_URL is configured on your server.'
                    : `Unable to reach the backend API (${base}). If your hosted backend is waking up from sleep, please tap Retry in a few seconds.`;
        }
        return {
            message: msg,
            statusCode: error.response?.status ?? 0,
            errors: data?.errors,
        };
    }
    return {
        message: 'An unexpected error occurred',
        statusCode: 0,
    };
}
exports.default = api;
