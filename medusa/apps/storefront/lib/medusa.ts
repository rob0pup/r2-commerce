// Server-side reads from the Medusa Store API. The publishable key scopes the
// request to our sales channel; the region resolves USD prices.

// Tolerate a backend URL set without a scheme (e.g. "host.up.railway.app").
function withScheme(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export const BACKEND = withScheme(process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000")
export const KEY = process.env.MEDUSA_PUBLISHABLE_KEY ?? ""
export const REGION = process.env.MEDUSA_REGION_ID ?? ""

// Shared fetch to the Store API with the publishable key attached. Used by both
// the catalog reads here and the cart proxy routes.
export function medusaFetch(path: string, init?: RequestInit) {
  return fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      "x-publishable-api-key": KEY,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
}

export type Product = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number | null
}

export type ProductVariant = {
  id: string
  title: string
  price: number | null
}

export type ProductDetail = Product & {
  description: string | null
  images: string[]
  variants: ProductVariant[]
}

type StoreVariant = {
  id: string
  title: string
  calculated_price?: { calculated_amount?: number }
}
type StoreProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  description?: string | null
  images?: { url: string }[]
  variants?: StoreVariant[]
}

function variantPrice(v?: StoreVariant): number | null {
  return v?.calculated_price?.calculated_amount ?? null
}

export async function getProducts(): Promise<Product[]> {
  if (!KEY || !REGION) return []
  try {
    const res = await medusaFetch(
      `/store/products?limit=100&region_id=${REGION}&fields=id,title,handle,thumbnail,*variants.calculated_price`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { products?: StoreProduct[] }
    return (data.products ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: p.thumbnail,
      price: variantPrice(p.variants?.[0]),
    }))
  } catch {
    return []
  }
}

export async function getProduct(handle: string): Promise<ProductDetail | null> {
  if (!KEY || !REGION) return null
  try {
    const res = await medusaFetch(
      `/store/products?handle=${encodeURIComponent(handle)}&region_id=${REGION}&fields=id,title,handle,description,thumbnail,images.url,*variants.calculated_price`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { products?: StoreProduct[] }
    const p = data.products?.[0]
    if (!p) return null
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: p.thumbnail,
      price: variantPrice(p.variants?.[0]),
      description: p.description ?? null,
      images: (p.images ?? []).map((i) => i.url).filter(Boolean),
      variants: (p.variants ?? []).map((v) => ({
        id: v.id,
        title: v.title,
        price: variantPrice(v),
      })),
    }
  } catch {
    return null
  }
}
