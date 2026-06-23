import { NextRequest, NextResponse } from "next/server"

import { medusaFetch } from "@/lib/medusa"

const FIELDS =
  "fields=id,currency_code,subtotal,total,item_subtotal,*items,*items.variant"

// POST /api/cart/items -> add a line item
export async function POST(req: NextRequest) {
  const { cartId, variantId, quantity } = await req.json()
  const res = await medusaFetch(`/store/carts/${cartId}/line-items?${FIELDS}`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity: quantity ?? 1 }),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

// PATCH /api/cart/items -> update a line item's quantity
export async function PATCH(req: NextRequest) {
  const { cartId, lineId, quantity } = await req.json()
  const res = await medusaFetch(
    `/store/carts/${cartId}/line-items/${lineId}?${FIELDS}`,
    { method: "POST", body: JSON.stringify({ quantity }) }
  )
  return NextResponse.json(await res.json(), { status: res.status })
}

// DELETE /api/cart/items?cartId=&lineId= -> remove a line item
export async function DELETE(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("cartId")
  const lineId = req.nextUrl.searchParams.get("lineId")
  const res = await medusaFetch(
    `/store/carts/${cartId}/line-items/${lineId}`,
    { method: "DELETE" }
  )
  const data = await res.json()
  // Medusa returns { deleted, parent: <cart> } for line-item deletes.
  return NextResponse.json({ cart: data.parent ?? data.cart ?? null }, { status: res.status })
}
