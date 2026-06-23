import { NextRequest, NextResponse } from "next/server"

import { authHeader, medusaFetch, REGION } from "@/lib/medusa"

const FIELDS =
  "fields=id,currency_code,subtotal,total,item_subtotal,*items,*items.variant"

// POST /api/cart -> create a cart in our region (carries customer token if any)
export async function POST(req: NextRequest) {
  const res = await medusaFetch(`/store/carts?${FIELDS}`, {
    method: "POST",
    headers: authHeader(req),
    body: JSON.stringify({ region_id: REGION }),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

// GET /api/cart?id=... -> fetch an existing cart
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ cart: null })
  const res = await medusaFetch(`/store/carts/${id}?${FIELDS}`, {
    headers: authHeader(req),
  })
  if (!res.ok) return NextResponse.json({ cart: null }, { status: res.status })
  return NextResponse.json(await res.json())
}
