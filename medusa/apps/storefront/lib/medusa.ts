// Server-side reads from the Medusa Store API. The publishable key scopes the
// request to our sales channel; the region resolves USD prices.
const BACKEND = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY ?? ""
const REGION = process.env.MEDUSA_REGION_ID ?? ""

export type Product = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number | null
}

type StoreVariant = { calculated_price?: { calculated_amount?: number } }
type StoreProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  variants?: StoreVariant[]
}

function toProduct(p: StoreProduct): Product {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    thumbnail: p.thumbnail,
    price: p.variants?.[0]?.calculated_price?.calculated_amount ?? null,
  }
}

export async function getProducts(): Promise<Product[]> {
  if (!KEY || !REGION) return []
  const url = `${BACKEND}/store/products?limit=100&region_id=${REGION}&fields=id,title,handle,thumbnail,*variants.calculated_price`
  const res = await fetch(url, {
    headers: { "x-publishable-api-key": KEY },
    next: { revalidate: 60 },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { products?: StoreProduct[] }
  return (data.products ?? []).map(toProduct)
}
