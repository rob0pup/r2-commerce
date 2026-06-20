import path from "node:path"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // This app lives in a monorepo next to a pnpm-based engine; point file tracing
  // at the Medusa workspace so Next doesn't guess the wrong root.
  outputFileTracingRoot: path.join(__dirname, "../.."),
}

export default nextConfig
