import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

import { SEMANTIC_SEARCH_MODULE } from "../modules/semantic-search"
import type SemanticSearchService from "../modules/semantic-search/service"

// Drop a product's embedding when it is deleted, so search never returns a
// product that no longer exists.
export default async function productDeleteHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const semanticSearch = container.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const logger = container.resolve("logger")

  await semanticSearch.removeProduct(data.id)
  logger.info(`[semantic-search] removed product ${data.id}`)
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
