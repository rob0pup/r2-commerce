import { NextRequest, NextResponse } from "next/server"

import { authHeader, medusaFetch } from "@/lib/medusa"

// POST /api/checkout/payment-session
// Creates (or reuses) the cart's payment collection and a payment session for
// the given provider, then returns the Stripe client secret when the provider
// is Stripe so the browser can confirm the card with Stripe.js. The manual
// provider needs no client secret; the session just has to exist before the
// cart is completed.
export async function POST(req: NextRequest) {
  const { cartId, provider } = await req.json()
  const auth = authHeader(req)
  const providerId: string = provider ?? "pp_system_default"

  // 1. Payment collection for the cart (Medusa returns the existing one if any).
  const pcRes = await medusaFetch("/store/payment-collections", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ cart_id: cartId }),
  })
  if (!pcRes.ok) {
    return NextResponse.json(await pcRes.json(), { status: pcRes.status })
  }
  const { payment_collection } = await pcRes.json()

  // 2. Payment session for the chosen provider.
  const sessRes = await medusaFetch(
    `/store/payment-collections/${payment_collection.id}/payment-sessions`,
    { method: "POST", headers: auth, body: JSON.stringify({ provider_id: providerId }) }
  )
  if (!sessRes.ok) {
    return NextResponse.json(await sessRes.json(), { status: sessRes.status })
  }
  const { payment_collection: pc } = await sessRes.json()

  const session = (pc?.payment_sessions ?? []).find(
    (s: { provider_id: string }) => s.provider_id === providerId
  )
  const clientSecret: string | null =
    (session?.data?.client_secret as string | undefined) ?? null

  return NextResponse.json({
    clientSecret,
    paymentCollectionId: pc?.id ?? payment_collection.id,
  })
}
