import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ProductStatus } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

import { SEMANTIC_SEARCH_MODULE } from "../modules/semantic-search"
import type SemanticSearchService from "../modules/semantic-search/service"

// A small demo catalog, deliberately varied so search-by-meaning beats keywords.
const CATALOG = [
  { name: "Waterproof Commuter Backpack", description: "Roll-top pack with a padded laptop sleeve, keeps gear dry in heavy rain.", price: 89 },
  { name: "Merino Wool Base Layer", description: "Lightweight thermal top that traps heat without bulk on cold hikes.", price: 64 },
  { name: "Packable Down Jacket", description: "Ultralight insulated jacket for freezing weather, packs into its own pocket.", price: 159 },
  { name: "Trail Running Shoes", description: "Grippy, water-resistant shoes built for muddy off-road trails.", price: 120 },
  { name: "Noise-Cancelling Headphones", description: "Over-ear headphones that silence a noisy office or a long flight.", price: 249 },
  { name: "Wireless Earbuds", description: "Compact sweatproof earbuds for workouts and calls on the go.", price: 99 },
  { name: "Home Espresso Machine", description: "Compact machine that pulls cafe-style shots and steams milk at home.", price: 399 },
  { name: "Insulated Water Bottle", description: "Vacuum flask that keeps drinks cold all day or hot for hours.", price: 35 },
  { name: "Cast Iron Skillet", description: "Pre-seasoned pan for searing, frying, and oven-baking, lasts a lifetime.", price: 45 },
  { name: "Mechanical Keyboard", description: "Tactile hot-swappable keyboard for fast, satisfying typing.", price: 130 },
  { name: "Warm LED Desk Lamp", description: "Dimmable lamp with warm light that's easy on the eyes at night.", price: 55 },
  { name: "Non-Slip Yoga Mat", description: "Cushioned, grippy mat for yoga, stretching, and home workouts.", price: 48 },
  { name: "Standing Desk Converter", description: "Raises your monitor and keyboard so you can work standing up.", price: 180 },
  { name: "Travel Toiletry Bag", description: "Hanging organizer with leakproof bottles for weekend trips.", price: 29 },
  { name: "Smart Sleep Tracker", description: "Bedside device that tracks sleep stages and gently wakes you.", price: 149 },
]

export default async function seedProducts({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const semanticSearch = container.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const logger = container.resolve("logger")

  const titles = new Set(CATALOG.map((c) => c.name))

  // Clean slate for our catalog so re-running is idempotent. Module-level delete
  // doesn't emit product.deleted, so drop the matching embeddings explicitly.
  const existing = await productModule.listProducts({}, { take: 1000 })
  const mine = existing.filter((p) => titles.has(p.title))
  if (mine.length) {
    await productModule.deleteProducts(mine.map((p) => p.id))
    for (const p of mine) await semanticSearch.removeProduct(p.id)
    logger.info(`Removed ${mine.length} existing catalog products.`)
  }

  logger.info(`Seeding ${CATALOG.length} products…`)
  for (const item of CATALOG) {
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: item.name,
            description: item.description,
            status: ProductStatus.PUBLISHED,
            options: [{ title: "Size", values: ["One Size"] }],
            variants: [
              {
                title: "One Size",
                options: { Size: "One Size" },
                prices: [{ amount: item.price, currency_code: "usd" }],
              },
            ],
          },
        ],
      },
    })
    const product = result[0]
    await semanticSearch.upsertProduct(product.id, `${item.name}. ${item.description}`)
    logger.info(`  ${product.title} ($${item.price})`)
  }
  logger.info("Done seeding + indexing.")
}
