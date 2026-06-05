/**
 * Simple in-memory cache with TTL for Next.js API routes.
 * Serverless-safe: each instance has its own cache.
 * For production multi-instance, use Redis or similar.
 *
 * Usage:
 *   import { cache } from '@/lib/cache'
 *   const data = cache.getOrSet('key', async () => fetchFromDB(), { ttl: 60 })
 */

type CacheEntry<T> = {
  value: T
  expires: number
}

const store = new Map<string, CacheEntry<unknown>>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.expires < now) store.delete(key)
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanup, 300_000)

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    if (entry.expires < Date.now()) {
      store.delete(key)
      return null
    }
    return entry.value
  },

  set<T>(key: string, value: T, ttlSeconds: number = 60) {
    store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
  },

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    opts: { ttl?: number } = {}
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) return cached
    const value = await fn()
    this.set(key, value, opts.ttl ?? 60)
    return value
  },

  invalidate(key: string) {
    store.delete(key)
  },

  invalidatePrefix(prefix: string) {
    for (const k of store.keys()) {
      if (k.startsWith(prefix)) store.delete(k)
    }
  },

  clear() {
    store.clear()
  },

  stats() {
    return { size: store.size }
  },
}
