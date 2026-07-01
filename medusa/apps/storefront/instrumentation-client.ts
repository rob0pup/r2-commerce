import * as Sentry from "@sentry/nextjs"

// Client-side Sentry init. Gated on the public DSN so nothing is sent until
// NEXT_PUBLIC_SENTRY_DSN is configured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
