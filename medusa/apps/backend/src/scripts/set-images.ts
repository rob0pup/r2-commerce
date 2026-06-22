import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Hand-picked Unsplash photos per product (Unsplash CDN is fast + reliable,
// unlike loremflickr which both failed to load and mismatched subjects). Sized
// to a square crop for the catalog grid. Swap an ID here to change a photo.
const PHOTO_ID: Record<string, string> = {
  "Waterproof Commuter Backpack": "1553062407-98eeb64c6a62",
  "Merino Wool Base Layer": "1610901157620-340856d0a50f",
  "Packable Down Jacket": "1706765779494-2705542ebe74",
  "Trail Running Shoes": "1542291026-7eec264c27ff",
  "Noise-Cancelling Headphones": "1505740420928-5e560c06d30e",
  "Wireless Earbuds": "1572569511254-d8f925fe2cbb",
  "Home Espresso Machine": "1616388761741-a5936c6f61f6",
  "Insulated Water Bottle": "1602143407151-7111542de6e8",
  "Cast Iron Skillet": "1579805625996-db7b60587362",
  "Mechanical Keyboard": "1618384887929-16ec33fab9ef",
  "Warm LED Desk Lamp": "1519219788971-8d9797e0928e",
  "Non-Slip Yoga Mat": "1599901860904-17e6ed7083a0",
  "Standing Desk Converter": "1622131278701-eb225474ffd2",
  "Travel Toiletry Bag": "1585687635785-994bda55c78e",
  "Smart Sleep Tracker": "1434494878577-86c23bcb06b9",
  "GPS Pet Tracker Collar": "1530281700549-e82e7bf110d6",
}

function imageFor(title: string): string | null {
  const id = PHOTO_ID[title]
  return id ? `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=80` : null
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

  let updated = 0
  for (const p of products) {
    const url = imageFor(p.title)
    if (!url) {
      logger.warn(`No photo mapped for "${p.title}", skipping`)
      continue
    }
    await productModule.updateProducts(p.id, {
      thumbnail: url,
      images: [{ url }],
    })
    updated++
  }
  logger.info(`Set images on ${updated} products`)
}
