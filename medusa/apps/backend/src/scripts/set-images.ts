import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Keyword(s) per product for real, subject-accurate photos. loremflickr is
// reliable and keyword-driven (Unsplash's keyword API is retired); `lock` keeps
// each product's photo stable across requests. Swap any to a hand-picked URL
// later if a match is weak.
const KEYWORDS: Record<string, string> = {
  "Waterproof Commuter Backpack": "backpack",
  "Merino Wool Base Layer": "sweater,wool",
  "Packable Down Jacket": "jacket",
  "Trail Running Shoes": "sneakers,shoes",
  "Noise-Cancelling Headphones": "headphones",
  "Wireless Earbuds": "earbuds,earphones",
  "Home Espresso Machine": "espresso,coffee",
  "Insulated Water Bottle": "waterbottle,bottle",
  "Cast Iron Skillet": "skillet,pan",
  "Mechanical Keyboard": "keyboard",
  "Warm LED Desk Lamp": "lamp,desk",
  "Non-Slip Yoga Mat": "yoga,mat",
  "Standing Desk Converter": "desk,office",
  "Travel Toiletry Bag": "toiletry,cosmetics",
  "Smart Sleep Tracker": "smartwatch,watch",
  "GPS Pet Tracker Collar": "dog,collar",
}

export default async function setImages({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
    pagination: { take: 200 },
  })

  let i = 0
  for (const p of products) {
    i++
    const tags = KEYWORDS[p.title] ?? "product"
    const url = `https://loremflickr.com/800/800/${tags}?lock=${i}`
    await productModule.updateProducts(p.id, {
      thumbnail: url,
      images: [{ url }],
    })
    logger.info(`${p.title} -> ${url}`)
  }
  logger.info(`Set images on ${products.length} products`)
}
