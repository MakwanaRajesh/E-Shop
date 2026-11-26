import api from '@/lib/api'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const MEMORY_CACHE = new Map<string, CacheEntry<unknown>>()
const IN_FLIGHT = new Map<string, Promise<unknown>>()
const STORAGE_PREFIX = 'nexus_cat_v1:'
const MAX_MEMORY_ENTRIES = 60

export function buildCatalogKey(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return path
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
  return entries.length > 0 ? `${path}?${entries.join('&')}` : path
}

export function peekCatalogCache<T>(
  key: string,
  freshMs = 30_000,
  staleMs = 300_000,
): { data: T; isFresh: boolean } | null {
  const now = Date.now()

  const mem = MEMORY_CACHE.get(key) as CacheEntry<T> | undefined
  if (mem) {
    const age = now - mem.timestamp
    if (age <= staleMs) {
      return { data: mem.data, isFresh: age <= freshMs }
    }
    MEMORY_CACHE.delete(key)
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry<T>
        const age = now - parsed.timestamp
        if (age <= staleMs) {
          setMemoryEntry(key, parsed)
          return { data: parsed.data, isFresh: age <= freshMs }
        }
        sessionStorage.removeItem(STORAGE_PREFIX + key)
      }
    } catch {
      /* ignore sessionStorage errors */
    }
  }

  return null
}

function setMemoryEntry<T>(key: string, entry: CacheEntry<T>) {
  if (MEMORY_CACHE.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = MEMORY_CACHE.keys().next().value
    if (oldestKey) MEMORY_CACHE.delete(oldestKey)
  }
  MEMORY_CACHE.set(key, entry)
}

export function setCatalogCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() }
  setMemoryEntry(key, entry)

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
    } catch {
      /* ignore quota exceeded */
    }
  }
}

export async function fetchWithCatalogCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { freshMs?: number; staleMs?: number; force?: boolean },
): Promise<T> {
  const freshMs = options?.freshMs ?? 30_000
  const staleMs = options?.staleMs ?? 300_000

  if (!options?.force) {
    const hit = peekCatalogCache<T>(key, freshMs, staleMs)
    if (hit?.isFresh) {
      return hit.data
    }
  }

  const existingPromise = IN_FLIGHT.get(key) as Promise<T> | undefined
  if (existingPromise) {
    return existingPromise
  }

  const promise = fetcher()
    .then((data) => {
      setCatalogCache(key, data)
      return data
    })
    .finally(() => {
      IN_FLIGHT.delete(key)
    })

  IN_FLIGHT.set(key, promise)
  return promise
}

export function prefetchCatalogEndpoint(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): void {
  if (typeof window === 'undefined') return
  const key = buildCatalogKey(url, params)
  const hit = peekCatalogCache(key, 30_000, 300_000)
  if (hit?.isFresh) return

  fetchWithCatalogCache(key, async () => {
    const { data } = await api.get(url, { params })
    return data
  }).catch(() => {
    /* ignore background prefetch failures */
  })
}

export function invalidateFrontendCatalogCache(): void {
  MEMORY_CACHE.clear()
  IN_FLIGHT.clear()
  if (typeof window !== 'undefined') {
    try {
      const toRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k?.startsWith(STORAGE_PREFIX)) toRemove.push(k)
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k))
    } catch {
      /* ignore */
    }
  }
}
