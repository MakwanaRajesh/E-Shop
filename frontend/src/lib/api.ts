import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { ApiError, AuthResponse } from '@/types'

// ─── Base Instance ─────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
        const { data } = await axios.post<AuthResponse>(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/auth/refresh`,
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
    const data = error.response?.data
    return {
      message: data?.message ?? error.message ?? 'An unexpected error occurred',
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
