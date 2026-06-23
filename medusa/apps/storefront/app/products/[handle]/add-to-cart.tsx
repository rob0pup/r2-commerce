"use client"

import { useState } from "react"

import type { ProductVariant } from "@/lib/medusa"

import { useCart } from "@/app/cart-context"

export function AddToCart({ variants }: { variants: ProductVariant[] }) {
  const { addItem, loading } = useCart()
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "")

  if (!variants.length) return null

  return (
    <div className="add-to-cart">
      {variants.length > 1 && (
        <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
              {v.price !== null ? ` — $${v.price}` : ""}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="add-btn"
        disabled={loading || !variantId}
        onClick={() => addItem(variantId, 1)}
      >
        {loading ? "Adding…" : "Add to cart"}
      </button>
    </div>
  )
}
