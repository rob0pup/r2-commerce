import { NextRequest, NextResponse } from "next/server"

// Tolerate a backend URL set without a scheme (e.g. "host.up.railway.app").
function withScheme(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

// Server-side proxy to the Medusa semantic-search endpoint. Keeps the browser
// same-origin (no CORS) and hides the backend URL from the client.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q) {
    return NextResponse.json({ query: "", results: [] })
  }

  const base = withScheme(process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000")
  const res = await fetch(`${base}/semantic-search?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    return NextResponse.json({ query: q, results: [], error: "search failed" }, { status: 502 })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
