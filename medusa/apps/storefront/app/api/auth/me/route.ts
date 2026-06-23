import { NextRequest, NextResponse } from "next/server"

import { authHeader, medusaFetch } from "@/lib/medusa"

// GET /api/auth/me -> the logged-in customer (forwards the Bearer token)
export async function GET(req: NextRequest) {
  const auth = authHeader(req)
  if (!auth.authorization) return NextResponse.json({ customer: null })
  const res = await medusaFetch("/store/customers/me", { headers: auth })
  if (!res.ok) return NextResponse.json({ customer: null }, { status: res.status })
  return NextResponse.json(await res.json())
}
