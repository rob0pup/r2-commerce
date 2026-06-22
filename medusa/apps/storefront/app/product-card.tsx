import type { Product } from "@/lib/medusa"

export function ProductCard({ p, score }: { p: Product; score?: number }) {
  return (
    <article className="product">
      <div className="product-img">
        {/* Plain img: thumbnails are external (loremflickr), no next/image config needed. */}
        {p.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumbnail} alt={p.title} loading="lazy" />
        ) : (
          <div className="product-noimg" />
        )}
        {typeof score === "number" && (
          <span className="product-match">{Math.round(score * 100)}% match</span>
        )}
      </div>
      <div className="product-meta">
        <h3>{p.title}</h3>
        <span className="product-price">{p.price !== null ? `$${p.price}` : "—"}</span>
      </div>
    </article>
  )
}
