import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { SEMANTIC_SEARCH_MODULE } from "../../modules/semantic-search"
import type SemanticSearchService from "../../modules/semantic-search/service"

// GET /semantic-search?q=...  → products ranked by meaning.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
  if (!q) {
    res.status(400).json({ message: "Provide a search query, e.g. ?q=warm jacket for hiking" })
    return
  }

  const semanticSearch = req.scope.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const productModule = req.scope.resolve(Modules.PRODUCT)

  const hits = await semanticSearch.search(q, 10)
  if (hits.length === 0) {
    res.json({ query: q, results: [] })
    return
  }

  // Fetch full product records through the product module, then keep ranking order.
  const products = await productModule.listProducts({ id: hits.map((h) => h.productId) })
  const byId = new Map(products.map((p) => [p.id, p]))

  const results = hits
    .map((h) => {
      const p = byId.get(h.productId)
      if (!p) return null
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        score: Number(h.score.toFixed(4)),
      }
    })
    .filter(Boolean)

  res.json({ query: q, results })
}
