import { NextRequest, NextResponse } from "next/server"

import { authHeader, medusaFetch } from "@/lib/medusa"

// POST /api/checkout/address -> set email + shipping/billing address on the cart
export async function POST(req: NextRequest) {
  const { cartId, email, address } = await req.json()
  const res = await medusaFetch(`/store/carts/${cartId}`, {
    method: "POST",
    headers: authHeader(req),
    body: JSON.stringify({
      email,
      shipping_address: address,
      billing_address: address,
    }),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
