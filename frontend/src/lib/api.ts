import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { ApiError, AuthResponse } from '@/types'

// ─── Base Instance ─────────────────────────────────────────────────────────────

const RAW_PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '')

function isLocalUrl(url: string): boolean {
  if (!url) return false
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(url)
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const pageHost = window.location.hostname.toLowerCase()
    const isBrowserLocal = pageHost === 'localhost' || pageHost === '127.0.0.1'

    if (!isBrowserLocal) {
      // Production browser: never try to reach the visitor's own localhost:5000.
      // Use configured production NEXT_PUBLIC_API_URL, or fall back cleanly to same-origin /api/proxy.
      if (RAW_PUBLIC_API_URL && !isLocalUrl(RAW_PUBLIC_API_URL)) {
        return RAW_PUBLIC_API_URL
      }
      return '/api/proxy'
    }
  }

  return RAW_PUBLIC_API_URL || 'http://localhost:5000'
}

const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000,
})

// ─── Token Helpers ─────────────────────────────────────────────────────────────

const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.refreshToken ?? null
  } catch {
    return null
  }
}

const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return
    const parsed = JSON.parse(raw)
    parsed.state.accessToken = accessToken
    parsed.state.refreshToken = refreshToken
    localStorage.setItem('auth-storage', JSON.stringify(parsed))
  } catch {
    /* ignore */
  }
}

// ─── Request Interceptor ──────────────────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl()
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response Interceptor ─────────────────────────────────────────────────────

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
      _coldStartRetried?: boolean
    }

    // Automatic single retry for idempotent GET calls during cloud cold-starts (Render/Railway sleep wake)
    const method = (originalRequest?.method ?? 'get').toLowerCase()
    const status = error.response?.status
    const isTransient = !error.response || error.code === 'ECONNABORTED' || status === 502 || status === 503 || status === 504
    if (originalRequest && method === 'get' && isTransient && !originalRequest._coldStartRetried) {
      originalRequest._coldStartRetried = true
      originalRequest.timeout = 60000
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return api(originalRequest)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        processQueue(error, null)
        isRefreshing = false
        return Promise.reject(transformError(error))
      }

      try {
        const base = getApiBaseUrl()
        const { data } = await axios.post<AuthResponse>(
          `${base}/api/auth/refresh`,
          { refreshToken },
        )
        setTokens(data.accessToken, data.refreshToken)
        processQueue(null, data.accessToken)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Clear auth state on refresh failure
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage')
          window.location.href = '/'
        }
        return Promise.reject(transformError(refreshError as AxiosError))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(transformError(error))
  },
)

// ─── Error Transformer ────────────────────────────────────────────────────────

function transformError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; detail?: string; title?: string; errors?: Record<string, string[]> } | undefined
    let msg = data?.message ?? data?.detail ?? data?.title ?? error.message ?? 'An unexpected error occurred'
    if (data?.errors && typeof data.errors === 'object') {
      const errList = Object.values(data.errors).flat().join(', ')
      if (errList) msg = errList
    }
    if (!error.response && (msg === 'Network Error' || error.code === 'ECONNABORTED')) {
      const base = getApiBaseUrl()
      msg =
        base === '/api/proxy'
          ? 'Unable to reach the backend API through proxy. Verify NEXT_PUBLIC_API_URL or API_URL is configured on your server.'
          : `Unable to reach the backend API (${base}). If your hosted backend is waking up from sleep, please tap Retry in a few seconds.`
    }
    return {
      message: msg,
      statusCode: error.response?.status ?? 0,
      errors: data?.errors,
    }
  }
  return {
    message: 'An unexpected error occurred',
    statusCode: 0,
  }
}

export { transformError }
export default api
