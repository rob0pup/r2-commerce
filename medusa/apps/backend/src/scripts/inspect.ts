import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Read-only: report the commerce config the storefront depends on.
export default async function inspect({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannel = container.resolve(Modules.SALES_CHANNEL)
  const apiKey = container.resolve(Modules.API_KEY)
  const region = container.resolve(Modules.REGION)

  const channels = await salesChannel.listSalesChannels({})
  logger.info(`SALES CHANNELS (${channels.length}):`)
  channels.forEach((c) => logger.info(`  - ${c.name} [${c.id}]`))

  const regions = await region.listRegions({})
  logger.info(`REGIONS (${regions.length}):`)
  regions.forEach((r) => logger.info(`  - ${r.name} / ${r.currency_code} [${r.id}]`))

  const keys = await apiKey.listApiKeys({ type: "publishable" })
  logger.info(`PUBLISHABLE API KEYS (${keys.length}):`)
  keys.forEach((k) => logger.info(`  - ${k.title}: ${k.token} [${k.id}]`))

  // Products + whether they're in a sales channel + have images
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "images.url", "sales_channels.id"],
    pagination: { take: 100 },
  })
  const withChannel = products.filter((p) => (p.sales_channels ?? []).length > 0)
  const withImage = products.filter((p) => p.thumbnail || (p.images ?? []).length > 0)
  logger.info(`PRODUCTS: ${products.length} total`)
  logger.info(`  in a sales channel: ${withChannel.length}`)
  logger.info(`  with an image: ${withImage.length}`)
}
