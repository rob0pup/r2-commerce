"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { authHeaders, useAuth } from "@/app/auth-context"

type Order = {
  id: string
  display_id: number
  total: number
  currency_code: string
  created_at: string
  items?: { id: string; title: string; quantity: number }[]
}

export default function AccountPage() {
  const { customer, loading, login, register, logout } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Load orders once logged in.
  useEffect(() => {
    if (!customer) return
    setOrdersLoading(true)
    fetch("/api/orders", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [customer])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const err =
      mode === "login"
        ? await login(email, password)
        : await register(email, password, firstName, lastName)
    if (err) setError(err)
  }

  // Logged in: profile + orders
  if (customer) {
    return (
      <main className="wrap account">
        <div className="account-head">
          <div>
            <h1>
              Hi, {customer.first_name ?? "there"}
            </h1>
            <p className="sub">{customer.email}</p>
          </div>
          <button type="button" className="linklike" onClick={logout}>
            Sign out
          </button>
        </div>

        <h2 className="account-h2">Your orders</h2>
        {ordersLoading ? (
          <p className="empty">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="empty">
            No orders yet.{" "}
            <Link href="/" className="linklike">
              Start shopping
            </Link>
          </p>
        ) : (
          <div className="order-list">
            {orders.map((o) => (
              <div className="order-row" key={o.id}>
                <div>
                  <div className="order-id">Order #{o.display_id}</div>
                  <div className="order-meta">
                    {new Date(o.created_at).toLocaleDateString()} ·{" "}
                    {(o.items ?? []).reduce((n, i) => n + i.quantity, 0)} item(s)
                  </div>
                </div>
                <div className="order-total">${o.total}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    )
  }

  // Logged out: login / register
  return (
    <main className="wrap account account-auth">
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>

      <form className="checkout-card" onSubmit={submit}>
        {mode === "register" && (
          <div className="row2">
            <input
              required
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              required
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="add-btn" disabled={loading}>
          {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        {error && <p className="checkout-error">{error}</p>}
      </form>
    </main>
  )
}
