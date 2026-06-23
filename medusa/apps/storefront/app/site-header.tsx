"use client"

import Link from "next/link"

import { useCart } from "./cart-context"
import { LogoMark } from "./logo-mark"

export function SiteHeader() {
  const { count, setOpen } = useCart()
  return (
    <header className="site-header">
      <Link href="/" className="site-brand">
        <LogoMark className="logo" />
        <span>R² Commerce</span>
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
    </header>
  )
}
