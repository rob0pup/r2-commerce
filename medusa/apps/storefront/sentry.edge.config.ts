import * as Sentry from "@sentry/nextjs"

// Edge-runtime Sentry init (middleware, edge routes). Gated on the DSN.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
})
