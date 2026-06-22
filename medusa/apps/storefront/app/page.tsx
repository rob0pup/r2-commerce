import { getProducts } from "@/lib/medusa"

import { Store } from "./store"

export default async function Home() {
  const products = await getProducts()
  return <Store products={products} />
}
