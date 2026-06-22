import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The monorepo's Medusa ESLint config isn't meant for this app and crashes the
  // production build; this is a tiny client app, so skip linting on build.
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
