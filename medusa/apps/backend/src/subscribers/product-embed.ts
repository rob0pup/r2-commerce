import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

import { SEMANTIC_SEARCH_MODULE } from "../modules/semantic-search"
import type SemanticSearchService from "../modules/semantic-search/service"

// Re-index a product's embedding whenever it is created or updated in the admin.
export default async function productEmbedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productModule = container.resolve(Modules.PRODUCT)
  const semanticSearch = container.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const logger = container.resolve("logger")

  const product = await productModule.retrieveProduct(data.id)
  const content = [product.title, product.subtitle, product.description]
    .filter(Boolean)
    .join(". ")

  await semanticSearch.upsertProduct(product.id, content)
  logger.info(`[semantic-search] indexed product ${product.id}`)
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
