import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ProductStatus } from "@medusajs/framework/utils"

import { SEMANTIC_SEARCH_MODULE } from "../modules/semantic-search"
import type SemanticSearchService from "../modules/semantic-search/service"

// A small demo catalog, deliberately varied so search-by-meaning beats keywords.
const CATALOG = [
  { name: "Waterproof Commuter Backpack", description: "Roll-top pack with a padded laptop sleeve, keeps gear dry in heavy rain." },
  { name: "Merino Wool Base Layer", description: "Lightweight thermal top that traps heat without bulk on cold hikes." },
  { name: "Packable Down Jacket", description: "Ultralight insulated jacket for freezing weather, packs into its own pocket." },
  { name: "Trail Running Shoes", description: "Grippy, water-resistant shoes built for muddy off-road trails." },
  { name: "Noise-Cancelling Headphones", description: "Over-ear headphones that silence a noisy office or a long flight." },
  { name: "Wireless Earbuds", description: "Compact sweatproof earbuds for workouts and calls on the go." },
  { name: "Home Espresso Machine", description: "Compact machine that pulls cafe-style shots and steams milk at home." },
  { name: "Insulated Water Bottle", description: "Vacuum flask that keeps drinks cold all day or hot for hours." },
  { name: "Cast Iron Skillet", description: "Pre-seasoned pan for searing, frying, and oven-baking, lasts a lifetime." },
  { name: "Mechanical Keyboard", description: "Tactile hot-swappable keyboard for fast, satisfying typing." },
  { name: "Warm LED Desk Lamp", description: "Dimmable lamp with warm light that's easy on the eyes at night." },
  { name: "Non-Slip Yoga Mat", description: "Cushioned, grippy mat for yoga, stretching, and home workouts." },
  { name: "Standing Desk Converter", description: "Raises your monitor and keyboard so you can work standing up." },
  { name: "Travel Toiletry Bag", description: "Hanging organizer with leakproof bottles for weekend trips." },
  { name: "Smart Sleep Tracker", description: "Bedside device that tracks sleep stages and gently wakes you." },
]

export default async function seedProducts({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const semanticSearch = container.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const logger = container.resolve("logger")

  const existing = await productModule.listProducts({}, { take: 1000 })
  const byTitle = new Map(existing.map((p) => [p.title, p]))

  logger.info(`Seeding ${CATALOG.length} products…`)
  for (const item of CATALOG) {
    let product = byTitle.get(item.name)
    if (!product) {
      const [created] = await productModule.createProducts([
        { title: item.name, description: item.description, status: ProductStatus.PUBLISHED },
      ])
      product = created
    }
    await semanticSearch.upsertProduct(product.id, `${item.name}. ${item.description}`)
    logger.info(`  indexed ${product.title}`)
  }
  logger.info("Done seeding + indexing.")
}
