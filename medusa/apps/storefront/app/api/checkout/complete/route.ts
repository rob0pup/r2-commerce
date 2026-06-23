import { NextRequest, NextResponse } from "next/server"

import { authHeader, medusaFetch } from "@/lib/medusa"

// POST /api/checkout/complete -> initialize payment (manual provider) and
// complete the cart into an order. Forwards the customer token so the order
// attaches to their account. Stripe will slot in here as a client-side card
// step before complete once a Stripe key is configured.
export async function POST(req: NextRequest) {
  const { cartId } = await req.json()
  const auth = authHeader(req)

  // 1. Payment collection for the cart
  const pcRes = await medusaFetch("/store/payment-collections", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ cart_id: cartId }),
  })
  if (!pcRes.ok) {
    return NextResponse.json(await pcRes.json(), { status: pcRes.status })
  }
  const { payment_collection } = await pcRes.json()

  // 2. Payment session with the manual provider
  const sessRes = await medusaFetch(
    `/store/payment-collections/${payment_collection.id}/payment-sessions`,
    { method: "POST", headers: auth, body: JSON.stringify({ provider_id: "pp_system_default" }) }
  )
  if (!sessRes.ok) {
    return NextResponse.json(await sessRes.json(), { status: sessRes.status })
  }

  // 3. Complete the cart -> order
  const res = await medusaFetch(`/store/carts/${cartId}/complete`, {
    method: "POST",
    headers: auth,
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
