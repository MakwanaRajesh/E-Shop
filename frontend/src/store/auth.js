"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const api_1 = require("@/lib/api");
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    login: (data) => set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
    }),
    setTokens: (accessToken, refreshToken, user) => set((state) => ({
        accessToken,
        refreshToken,
        user: user ?? state.user,
        isAuthenticated: Boolean(accessToken),
    })),
    logout: (skipServerRevoke = false) => {
        const currentAccessToken = get().accessToken;
        if (!skipServerRevoke && currentAccessToken && typeof window !== 'undefined') {
            const base = (0, api_1.getApiBaseUrl)();
            fetch(`${base}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${currentAccessToken}`,
                    'Content-Type': 'application/json',
                },
                keepalive: true,
            }).catch(() => null);
        }
        set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
        });
    },
    updateUser: (user) => set((state) => ({
        ...state,
        user,
    })),
}), {
    name: 'auth-storage',
    storage: (0, middleware_1.createJSONStorage)(() => typeof window !== 'undefined' ? localStorage : null),
}));
// Keep in-memory Zustand store synchronized across browser tabs when another tab refreshes tokens or logs out
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key !== 'auth-storage')
            return;
        try {
            if (!event.newValue) {
                exports.useAuthStore.setState({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
                return;
            }
            const parsed = JSON.parse(event.newValue);
            const next = parsed?.state;
            if (!next)
                return;
            exports.useAuthStore.setState({
                user: next.user ?? null,
                accessToken: next.accessToken ?? null,
                refreshToken: next.refreshToken ?? null,
                isAuthenticated: Boolean(next.isAuthenticated && next.accessToken),
            });
        }
        catch {
            /* ignore malformed cross-tab payload */
        }
    });
}
