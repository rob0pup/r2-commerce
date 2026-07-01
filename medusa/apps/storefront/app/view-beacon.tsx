"use client"

import { useEffect } from "react"

// Records a visit in the shared backoffice counter, cross-origin to the
// portfolio's /api/hit (only that app holds the Redis creds). Fire-and-forget.
const HIT = "https://robinrahman.pro/api/hit?site=r2-commerce"

export function ViewBeacon() {
  useEffect(() => {
    try {
      if (!navigator.sendBeacon?.(HIT)) {
        fetch(HIT, { method: "POST", mode: "no-cors", keepalive: true }).catch(
          () => {}
        )
      }
    } catch {
      /* ignore */
    }
  }, [])
  return null
}
