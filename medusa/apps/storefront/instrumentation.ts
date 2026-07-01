import * as Sentry from "@sentry/nextjs"

// Loads the right Sentry init for the active runtime. Both configs no-op
// without a DSN, so this is safe on un-provisioned deploys.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
