"use client"

import { useCart } from "./cart-context"

export function CartDrawer() {
  const { cart, open, setOpen, updateItem, removeItem, loading } = useCart()
  const items = cart?.items ?? []

  return (
    <>
      <div
        className={`drawer-scrim ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside className={`drawer ${open ? "is-open" : ""}`} aria-label="Cart">
        <div className="drawer-head">
          <span>Your cart</span>
          <button type="button" className="drawer-x" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="drawer-empty">Your cart is empty.</p>
        ) : (
          <div className="drawer-items">
            {items.map((it) => (
              <div className="drawer-item" key={it.id}>
                {it.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.thumbnail} alt={it.title} />
                ) : (
                  <div className="drawer-item-noimg" />
                )}
                <div className="drawer-item-main">
                  <div className="drawer-item-title">{it.title}</div>
                  <div className="drawer-item-price">${it.unit_price}</div>
                  <div className="qty">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        it.quantity <= 1
                          ? removeItem(it.id)
                          : updateItem(it.id, it.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span>{it.quantity}</span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => updateItem(it.id, it.quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="drawer-remove"
                      disabled={loading}
                      onClick={() => removeItem(it.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="drawer-item-total">${it.total}</div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="drawer-subtotal">
              <span>Subtotal</span>
              <span>${cart?.subtotal ?? 0}</span>
            </div>
            <button type="button" className="drawer-checkout" disabled>
              Checkout (coming soon)
            </button>
            <p className="drawer-note">Stripe checkout lands in the next phase.</p>
          </div>
        )}
      </aside>
    </>
  )
}
