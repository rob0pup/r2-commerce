import * as Sentry from "@sentry/nextjs"

// Server-side Sentry init. Gated on the DSN so builds and un-provisioned
// deploys stay silent — it activates the moment SENTRY_DSN is set.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
})
