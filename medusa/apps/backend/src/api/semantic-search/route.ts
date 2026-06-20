import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { SEMANTIC_SEARCH_MODULE } from "../../modules/semantic-search"
import type SemanticSearchService from "../../modules/semantic-search/service"

type GraphProduct = {
  id: string
  title: string
  description: string | null
  variants?: { prices?: { amount: number; currency_code: string }[] }[]
}

// Lowest USD price across a product's variants, or null if it has none.
function lowestPrice(p: GraphProduct): number | null {
  const amounts = (p.variants ?? [])
    .flatMap((v) => v.prices ?? [])
    .filter((pr) => pr.currency_code === "usd")
    .map((pr) => pr.amount)
  return amounts.length ? Math.min(...amounts) : null
}

// Below this cosine similarity a result isn't a real match, just the nearest of
// a bad bunch. Keeping it out is what separates "ranked catalog dump" from search.
const DEFAULT_THRESHOLD = 0.62
const DEFAULT_LIMIT = 8

function parseNumber(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

// GET /semantic-search?q=...&threshold=&limit=  → products ranked by meaning.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
  if (!q) {
    res.status(400).json({ message: "Provide a search query, e.g. ?q=warm jacket for hiking" })
    return
  }

  const threshold = parseNumber(req.query.threshold, DEFAULT_THRESHOLD)
  const limit = Math.min(parseNumber(req.query.limit, DEFAULT_LIMIT), 20)

  const semanticSearch = req.scope.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Over-fetch, then keep only genuinely relevant hits above the threshold.
  const hits = (await semanticSearch.search(q, 20))
    .filter((h) => h.score >= threshold)
    .slice(0, limit)

  if (hits.length === 0) {
    res.json({ query: q, threshold, results: [] })
    return
  }

  // Graph query resolves prices through the product→pricing module link.
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "description", "variants.prices.amount", "variants.prices.currency_code"],
    filters: { id: hits.map((h) => h.productId) },
  })
  const byId = new Map((products as GraphProduct[]).map((p) => [p.id, p]))

  const results = hits
    .map((h) => {
      const p = byId.get(h.productId)
      if (!p) return null
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        price: lowestPrice(p),
        score: Number(h.score.toFixed(4)),
      }
    })
    .filter(Boolean)

  res.json({ query: q, threshold, count: results.length, results })
}
