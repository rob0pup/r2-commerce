// Tiny in-memory fixed-window rate limiter. Enough to protect the public
// search endpoint on a single instance; for multi-instance you'd back this
// with Redis. `now` is injectable so the logic is unit-testable without timers.

export type RateLimiterOptions = {
  windowMs: number
  max: number
  now?: () => number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetMs: number
}

export function createRateLimiter({ windowMs, max, now = () => Date.now() }: RateLimiterOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return {
    check(key: string): RateLimitResult {
      const t = now()
      const entry = hits.get(key)

      if (!entry || t >= entry.resetAt) {
        hits.set(key, { count: 1, resetAt: t + windowMs })
        // Opportunistically drop expired keys so the map can't grow unbounded.
        if (hits.size > 5000) {
          for (const [k, v] of hits) {
            if (t >= v.resetAt) hits.delete(k)
          }
        }
        return { allowed: true, remaining: max - 1, resetMs: windowMs }
      }

      entry.count++
      return {
        allowed: entry.count <= max,
        remaining: Math.max(0, max - entry.count),
        resetMs: entry.resetAt - t,
      }
    },
  }
}
