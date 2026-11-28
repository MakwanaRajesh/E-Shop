import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, AuthResponse } from '@/types'
import { getApiBaseUrl } from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (data: AuthResponse) => void
  setTokens: (accessToken: string, refreshToken: string, user?: User) => void
  logout: (skipServerRevoke?: boolean) => void
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (data: AuthResponse) =>
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        }),

      setTokens: (accessToken: string, refreshToken: string, user?: User) =>
        set((state) => ({
          accessToken,
          refreshToken,
          user: user ?? state.user,
          isAuthenticated: Boolean(accessToken),
        })),

      logout: (skipServerRevoke = false) => {
        const currentAccessToken = get().accessToken
        if (!skipServerRevoke && currentAccessToken && typeof window !== 'undefined') {
          const base = getApiBaseUrl()
          fetch(`${base}/api/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${currentAccessToken}`,
              'Content-Type': 'application/json',
            },
            keepalive: true,
          }).catch(() => null)
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      updateUser: (user: User) =>
        set((state) => ({
          ...state,
          user,
        })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
    },
  ),
)

// Keep in-memory Zustand store synchronized across browser tabs when another tab refreshes tokens or logs out
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'auth-storage') return
    try {
      if (!event.newValue) {
        useAuthStore.setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
        return
      }
      const parsed = JSON.parse(event.newValue)
      const next = parsed?.state
      if (!next) return
      useAuthStore.setState({
        user: next.user ?? null,
        accessToken: next.accessToken ?? null,
        refreshToken: next.refreshToken ?? null,
        isAuthenticated: Boolean(next.isAuthenticated && next.accessToken),
      })
    } catch {
      /* ignore malformed cross-tab payload */
    }
  })
}
