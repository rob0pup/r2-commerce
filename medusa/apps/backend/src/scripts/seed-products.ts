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
  { name: "GPS Pet Tracker Collar", description: "Lightweight collar that tracks your dog's location and activity from your phone.", price: 59 },
  { name: "Ergonomic Office Chair", description: "Mesh-back chair with adjustable lumbar support for long days at the desk.", price: 320 },
  { name: "Portable Bluetooth Speaker", description: "Rugged pocket speaker with surprising bass for the beach, shower, or backyard.", price: 79 },
  { name: "Chef's Knife", description: "Razor-sharp 8-inch blade that breezes through herbs, onions, and squash.", price: 85 },
  { name: "Memory Foam Pillow", description: "Contouring pillow that cradles your neck for deeper, pain-free sleep.", price: 39 },
  { name: "Electric Gooseneck Kettle", description: "Pour-over kettle with a precise spout and exact temperature control.", price: 49 },
  { name: "Carry-On Hardshell Suitcase", description: "Lightweight spinner that fits the overhead bin and shrugs off rough handling.", price: 175 },
  { name: "Foam Roller", description: "Firm roller for working out tight muscles and sore legs after training.", price: 28 },
  { name: "Fitness Smartwatch", description: "Tracks heart rate, runs, and sleep with a battery that lasts a week.", price: 199 },
  { name: "Packable Rain Shell", description: "Waterproof, breathable jacket that stuffs into its own pocket for sudden downpours.", price: 110 },
  { name: "French Press", description: "Brews rich, full-bodied coffee with no paper filter and no electricity.", price: 32 },
  { name: "Adjustable Dumbbell Set", description: "One pair that dials from light to heavy, replacing a whole rack of weights.", price: 249 },
  { name: "Blackout Sleep Mask", description: "Contoured mask that blocks every bit of light without pressing on your eyes.", price: 22 },
  { name: "Mesh WiFi System", description: "Blankets a whole house in fast, steady WiFi with no dead zones.", price: 145 },
  { name: "Leather Weekender Duffel", description: "Roomy full-grain leather bag sized for a stylish two-night getaway.", price: 160 },
  { name: "HEPA Air Purifier", description: "Quietly clears dust, smoke, and allergens from a large room.", price: 189 },
]

export default async function seedProducts({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const semanticSearch = container.resolve(SEMANTIC_SEARCH_MODULE) as SemanticSearchService
  const logger = container.resolve("logger")

  // Idempotent and non-destructive: create only the catalog products that
  // aren't already in the store (matched by title), and leave everything else
  // (existing products, their orders, edits made in the admin) untouched. Safe
  // to re-run after adding items to CATALOG.
  const existing = await productModule.listProducts({}, { take: 1000 })
  const have = new Set(existing.map((p) => p.title))
  const toCreate = CATALOG.filter((c) => !have.has(c.name))
  logger.info(
    `Catalog: ${CATALOG.length} defined, ${CATALOG.length - toCreate.length} already present, creating ${toCreate.length}…`
  )
  for (const item of toCreate) {
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
