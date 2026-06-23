import { NextRequest, NextResponse } from "next/server"

import { authHeader, medusaFetch } from "@/lib/medusa"

// GET /api/orders -> the logged-in customer's orders
export async function GET(req: NextRequest) {
  const auth = authHeader(req)
  if (!auth.authorization) return NextResponse.json({ orders: [] })
  const res = await medusaFetch(
    "/store/orders?limit=50&order=-created_at&fields=id,display_id,total,currency_code,created_at,*items",
    { headers: auth }
  )
  if (!res.ok) return NextResponse.json({ orders: [] }, { status: res.status })
  return NextResponse.json(await res.json())
}
