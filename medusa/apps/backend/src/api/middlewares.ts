import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"

import { createRateLimiter } from "../lib/rate-limit"

// The public /semantic-search route embeds the query with Gemini and hits the
// vector index on every call, so it's worth protecting from abuse. 30 requests
// per minute per IP is generous for real browsing and cheap to enforce.
const SEARCH_MAX = 30
const searchLimiter = createRateLimiter({ windowMs: 60_000, max: SEARCH_MAX })

function clientIp(req: MedusaRequest): string {
  const fwd = req.headers["x-forwarded-for"]
  const first = Array.isArray(fwd) ? fwd[0] : fwd
  return first?.split(",")[0]?.trim() || req.ip || "unknown"
}

function rateLimitSearch(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const { allowed, remaining, resetMs } = searchLimiter.check(clientIp(req))

  res.setHeader("X-RateLimit-Limit", String(SEARCH_MAX))
  res.setHeader("X-RateLimit-Remaining", String(remaining))

  if (!allowed) {
    res.setHeader("Retry-After", String(Math.ceil(resetMs / 1000)))
    res.status(429).json({ message: "Too many search requests. Please slow down and try again shortly." })
    return
  }

  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/semantic-search",
      method: ["GET"],
      middlewares: [rateLimitSearch],
    },
  ],
})
