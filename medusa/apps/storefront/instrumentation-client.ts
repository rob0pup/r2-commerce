import * as Sentry from "@sentry/nextjs"

// Client-side Sentry init. Gated on the public DSN so nothing is sent until
// NEXT_PUBLIC_SENTRY_DSN is configured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
  // Session Replay, privacy-first: mask all text, block all media. Record 10%
  // of sessions, and 100% of any session that hits an error.
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
