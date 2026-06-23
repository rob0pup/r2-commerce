import Link from "next/link"
import { notFound } from "next/navigation"

import { getProduct } from "@/lib/medusa"

import { AddToCart } from "./add-to-cart"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) notFound()

  const hero = product.images[0] ?? product.thumbnail

  return (
    <main className="wrap product-page">
      <Link href="/" className="back-link">
        ← Back to catalog
      </Link>

      <div className="product-detail">
        <div className="product-detail-img">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={product.title} />
          ) : (
            <div className="product-noimg" />
          )}
        </div>

        <div className="product-detail-info">
          <h1>{product.title}</h1>
          <div className="product-detail-price">
            {product.price !== null ? `$${product.price}` : "—"}
          </div>
          {product.description && (
            <p className="product-detail-desc">{product.description}</p>
          )}
          <AddToCart variants={product.variants} />
        </div>
      </div>
    </main>
  )
}
