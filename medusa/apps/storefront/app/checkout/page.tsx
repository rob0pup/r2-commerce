"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { authJsonHeaders } from "@/app/auth-context"
import { useCart } from "@/app/cart-context"

import { StripePayment, stripeConfigured } from "./stripe-payment"

type ShippingOption = { id: string; name: string; amount: number }
type Totals = { subtotal: number; shipping: number; total: number }
type Order = { id: string; total: number; email: string }

const EMPTY_ADDRESS = {
  first_name: "",
  last_name: "",
  address_1: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: "us",
}

export default function CheckoutPage() {
  const { cart, clearCart } = useCart()
  const [step, setStep] = useState<"address" | "shipping" | "review" | "done">("address")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS })
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [optionId, setOptionId] = useState("")
  const [totals, setTotals] = useState<Totals | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [clientSecret, setClientSecret] = useState("")

  const cartId = cart?.id

  // Load shipping options when entering the shipping step.
  useEffect(() => {
    if (step !== "shipping" || !cartId) return
    fetch(`/api/checkout/shipping-options?cartId=${cartId}`)
      .then((r) => r.json())
      .then((d) => {
        const opts: ShippingOption[] = (d.shipping_options ?? []).map(
          (o: { id: string; name: string; amount?: number; calculated_price?: { calculated_amount?: number } }) => ({
            id: o.id,
            name: o.name,
            amount: o.amount ?? o.calculated_price?.calculated_amount ?? 0,
          })
        )
        setOptions(opts)
        if (opts[0]) setOptionId(opts[0].id)
      })
      .catch(() => setError("Could not load shipping options."))
  }, [step, cartId])

  // On the review step with Stripe configured, create the Stripe payment session
  // up front so the card form has a client secret to confirm against.
  useEffect(() => {
    if (step !== "review" || !stripeConfigured || !cartId || clientSecret) return
    fetch("/api/checkout/payment-session", {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ cartId, provider: "pp_stripe_stripe" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret)
        else setError("Could not start the card payment.")
      })
      .catch(() => setError("Could not start the card payment."))
  }, [step, cartId, clientSecret])

  if (order) {
    return (
      <main className="wrap checkout">
        <div className="order-confirmed">
          <h1>Order confirmed 🎉</h1>
          <p>
            Thanks! Your test order <code>{order.id}</code> is placed, total{" "}
            <strong>${order.total}</strong>.
          </p>
          <p className="checkout-note">
            {stripeConfigured
              ? "Paid with a Stripe test card (no real charge)."
              : "Paid via the manual provider (no real charge)."}
          </p>
          <Link href="/" className="add-btn">
            Continue shopping
          </Link>
        </div>
      </main>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="wrap checkout">
        <p className="empty">Your cart is empty.</p>
        <Link href="/" className="linklike">
          Browse the catalog
        </Link>
      </main>
    )
  }

  async function submitAddress(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/checkout/address", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ cartId, email, address }),
      })
      if (!r.ok) throw new Error()
      setStep("shipping")
    } catch {
      setError("Could not save address.")
    } finally {
      setLoading(false)
    }
  }

  async function submitShipping() {
    if (!optionId) return
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/checkout/shipping", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ cartId, optionId }),
      })
      const d = await r.json()
      if (!r.ok || !d.cart) throw new Error()
      setTotals({
        subtotal: d.cart.subtotal ?? cart?.subtotal ?? 0,
        shipping: d.cart.shipping_total ?? 0,
        total: d.cart.total ?? 0,
      })
      setStep("review")
    } catch {
      setError("Could not set shipping method.")
    } finally {
      setLoading(false)
    }
  }

  // Complete the cart into an order. Called after the Stripe card is confirmed,
  // or directly in the manual flow. Does not toggle `loading` itself so the
  // caller (Stripe form or manual button) owns the spinner.
  async function completeOrder() {
    const r = await fetch("/api/checkout/complete", {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ cartId }),
    })
    const d = await r.json()
    if (d.type === "order" && d.order) {
      setOrder({ id: d.order.id, total: d.order.total, email: d.order.email })
      clearCart()
      setStep("done")
    } else {
      setError(d.message ?? "Could not place the order.")
    }
  }

  // Manual provider flow (no Stripe key): create the session, then complete.
  async function placeOrderManual() {
    setLoading(true)
    setError("")
    try {
      const s = await fetch("/api/checkout/payment-session", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ cartId, provider: "pp_system_default" }),
      })
      if (!s.ok) throw new Error()
      await completeOrder()
    } catch {
      setError("Could not place the order.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="wrap checkout">
      <Link href="/" className="back-link">
        ← Back to catalog
      </Link>
      <h1>Checkout</h1>

      <div className="checkout-grid">
        <div className="checkout-steps">
          {/* Address */}
          {step === "address" && (
            <form className="checkout-card" onSubmit={submitAddress}>
              <h2>Contact &amp; shipping</h2>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="row2">
                <input
                  required
                  placeholder="First name"
                  value={address.first_name}
                  onChange={(e) => setAddress({ ...address, first_name: e.target.value })}
                />
                <input
                  required
                  placeholder="Last name"
                  value={address.last_name}
                  onChange={(e) => setAddress({ ...address, last_name: e.target.value })}
                />
              </div>
              <input
                required
                placeholder="Address"
                value={address.address_1}
                onChange={(e) => setAddress({ ...address, address_1: e.target.value })}
              />
              <div className="row2">
                <input
                  required
                  placeholder="City"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
                <input
                  required
                  placeholder="State"
                  value={address.province}
                  onChange={(e) => setAddress({ ...address, province: e.target.value })}
                />
              </div>
              <input
                required
                placeholder="ZIP code"
                value={address.postal_code}
                onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
              />
              <button type="submit" className="add-btn" disabled={loading}>
                {loading ? "Saving…" : "Continue to shipping"}
              </button>
            </form>
          )}

          {/* Shipping */}
          {step === "shipping" && (
            <div className="checkout-card">
              <h2>Shipping method</h2>
              {options.length === 0 ? (
                <p className="empty">Loading options…</p>
              ) : (
                <div className="ship-options">
                  {options.map((o) => (
                    <label key={o.id} className={`ship-option ${optionId === o.id ? "sel" : ""}`}>
                      <input
                        type="radio"
                        name="ship"
                        checked={optionId === o.id}
                        onChange={() => setOptionId(o.id)}
                      />
                      <span>{o.name}</span>
                      <span className="ship-price">${o.amount}</span>
                    </label>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="add-btn"
                disabled={loading || !optionId}
                onClick={submitShipping}
              >
                {loading ? "…" : "Continue to review"}
              </button>
            </div>
          )}

          {/* Review */}
          {step === "review" && (
            <div className="checkout-card">
              <h2>Review &amp; place order</h2>
              {stripeConfigured ? (
                clientSecret ? (
                  <>
                    <p className="checkout-note">
                      Test mode. Use card <code>4242 4242 4242 4242</code>, any future
                      expiry, any CVC.
                    </p>
                    <StripePayment
                      clientSecret={clientSecret}
                      loading={loading}
                      setLoading={setLoading}
                      setError={setError}
                      onPaid={completeOrder}
                    />
                  </>
                ) : (
                  <p className="empty">Loading payment…</p>
                )
              ) : (
                <>
                  <p className="checkout-note">
                    Payment uses the manual provider (no real charge).
                  </p>
                  <button
                    type="button"
                    className="add-btn"
                    disabled={loading}
                    onClick={placeOrderManual}
                  >
                    {loading ? "Placing…" : "Place order"}
                  </button>
                </>
              )}
            </div>
          )}

          {error && <p className="checkout-error">{error}</p>}
        </div>

        {/* Summary */}
        <aside className="checkout-summary">
          <h2>Order summary</h2>
          {cart.items.map((it) => (
            <div className="summary-row" key={it.id}>
              <span>
                {it.title} × {it.quantity}
              </span>
              <span>${it.total}</span>
            </div>
          ))}
          <div className="summary-row muted">
            <span>Subtotal</span>
            <span>${totals?.subtotal ?? cart.subtotal}</span>
          </div>
          {totals && (
            <div className="summary-row muted">
              <span>Shipping</span>
              <span>${totals.shipping}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>Total</span>
            <span>${totals?.total ?? cart.subtotal}</span>
          </div>
        </aside>
      </div>
    </main>
  )
}
