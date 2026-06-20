import { Module } from "@medusajs/framework/utils"

import SemanticSearchService from "./service"

export const SEMANTIC_SEARCH_MODULE = "semanticSearch"

export default Module(SEMANTIC_SEARCH_MODULE, {
  service: SemanticSearchService,
})
