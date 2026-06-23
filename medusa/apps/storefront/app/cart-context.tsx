"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

export type CartItem = {
  id: string
  title: string
  thumbnail: string | null
  quantity: number
  unit_price: number
  total: number
  variant_id: string
}
export type Cart = {
  id: string
  items: CartItem[]
  subtotal: number
  total: number
} | null

type CartContextValue = {
  cart: Cart
  count: number
  open: boolean
  loading: boolean
  setOpen: (open: boolean) => void
  addItem: (variantId: string, quantity?: number) => Promise<void>
  updateItem: (lineId: string, quantity: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const LS_KEY = "r2_cart_id"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Re-hydrate a saved cart on load.
  useEffect(() => {
    const id = localStorage.getItem(LS_KEY)
    if (!id) return
    fetch(`/api/cart?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.cart) setCart(d.cart as Cart)
        else localStorage.removeItem(LS_KEY)
      })
      .catch(() => {})
  }, [])

  const ensureCart = useCallback(async (): Promise<string> => {
    const existing = cart?.id ?? localStorage.getItem(LS_KEY)
    if (existing) return existing
    const r = await fetch("/api/cart", { method: "POST" })
    const d = await r.json()
    localStorage.setItem(LS_KEY, d.cart.id)
    setCart(d.cart as Cart)
    return d.cart.id as string
  }, [cart])

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setLoading(true)
      try {
        const cartId = await ensureCart()
        const r = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cartId, variantId, quantity }),
        })
        const d = await r.json()
        if (d.cart) setCart(d.cart as Cart)
        setOpen(true)
      } finally {
        setLoading(false)
      }
    },
    [ensureCart]
  )

  const updateItem = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart) return
      setLoading(true)
      try {
        const r = await fetch("/api/cart/items", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cartId: cart.id, lineId, quantity }),
        })
        const d = await r.json()
        if (d.cart) setCart(d.cart as Cart)
      } finally {
        setLoading(false)
      }
    },
    [cart]
  )

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart) return
      setLoading(true)
      try {
        const r = await fetch(`/api/cart/items?cartId=${cart.id}&lineId=${lineId}`, {
          method: "DELETE",
        })
        const d = await r.json()
        if (d.cart) setCart(d.cart as Cart)
      } finally {
        setLoading(false)
      }
    },
    [cart]
  )

  const clearCart = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setCart(null)
    setOpen(false)
  }, [])

  const count = (cart?.items ?? []).reduce((n, i) => n + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{ cart, count, open, loading, setOpen, addItem, updateItem, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
