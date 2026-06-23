"use client"

import Link from "next/link"

import { useAuth } from "./auth-context"
import { useCart } from "./cart-context"
import { LogoMark } from "./logo-mark"

export function SiteHeader() {
  const { count, setOpen } = useCart()
  const { customer } = useAuth()
  return (
    <header className="site-header">
      <Link href="/" className="site-brand">
        <LogoMark className="logo" />
        <span>R² Commerce</span>
      </Link>
      <nav className="site-nav">
        <Link href="/account" className="nav-link">
          {customer ? (customer.first_name ?? "Account") : "Sign in"}
        </Link>
        <button
          type="button"
          className="cart-btn"
          onClick={() => setOpen(true)}
          aria-label="Open cart"
        >
          Cart
          {count > 0 && <span className="cart-count">{count}</span>}
        </button>
      </nav>
    </header>
  )
}
