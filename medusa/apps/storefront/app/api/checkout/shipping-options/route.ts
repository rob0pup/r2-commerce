import { NextRequest, NextResponse } from "next/server"

import { medusaFetch } from "@/lib/medusa"

// GET /api/checkout/shipping-options?cartId=... -> shipping options for the cart
export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cartId")
  if (!cartId) return NextResponse.json({ shipping_options: [] })
  const res = await medusaFetch(`/store/shipping-options?cart_id=${cartId}`)
  return NextResponse.json(await res.json(), { status: res.status })
}
