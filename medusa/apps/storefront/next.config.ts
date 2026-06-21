import path from "node:path"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // This app lives in a monorepo next to a pnpm-based engine; point file tracing
  // at the Medusa workspace so Next doesn't guess the wrong root.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // The monorepo's Medusa ESLint config isn't meant for this app and crashes the
  // production build; this is a tiny client app, so skip linting on build.
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
