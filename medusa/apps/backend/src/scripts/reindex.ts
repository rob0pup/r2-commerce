import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { SEMANTIC_SEARCH_MODULE } from "../modules/semantic-search"
import type SemanticSearchService from "../modules/semantic-search/service"

// Re-embed every product. Useful after changing the embedding model or schema.
export default async function reindex({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const semanticSearch = container.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const logger = container.resolve("logger")

  const products = await productModule.listProducts({}, { take: 1000 })
  logger.info(`Reindexing ${products.length} products…`)
  for (const p of products) {
    const content = [p.title, p.subtitle, p.description].filter(Boolean).join(". ")
    await semanticSearch.upsertProduct(p.id, content)
  }
  logger.info("Done.")
}
