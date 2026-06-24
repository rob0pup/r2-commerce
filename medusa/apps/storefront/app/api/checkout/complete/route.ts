import { NextRequest, NextResponse } from "next/server"

import { authHeader, medusaFetch } from "@/lib/medusa"

// POST /api/checkout/complete -> complete the cart into an order. The payment
// session is created beforehand via /api/checkout/payment-session (and, for
// Stripe, the card is confirmed client-side before this is called). Forwards
// the customer token so the order attaches to their account.
export async function POST(req: NextRequest) {
  const { cartId } = await req.json()
  const res = await medusaFetch(`/store/carts/${cartId}/complete`, {
    method: "POST",
    headers: authHeader(req),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
