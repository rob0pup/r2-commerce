import { NextRequest, NextResponse } from "next/server"

import { medusaFetch } from "@/lib/medusa"

// POST /api/checkout/shipping -> select a shipping method
export async function POST(req: NextRequest) {
  const { cartId, optionId } = await req.json()
  const res = await medusaFetch(
    `/store/carts/${cartId}/shipping-methods?fields=id,subtotal,shipping_total,total,*items`,
    { method: "POST", body: JSON.stringify({ option_id: optionId }) }
  )
  return NextResponse.json(await res.json(), { status: res.status })
}
