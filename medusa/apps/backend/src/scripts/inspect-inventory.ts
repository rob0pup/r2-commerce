import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Read-only: learn the stock-location + inventory wiring the cart needs.
export default async function inspectInventory({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
  const salesChannel = container.resolve(Modules.SALES_CHANNEL)

  const locations = await stockLocation.listStockLocations({})
  logger.info(`STOCK LOCATIONS (${locations.length}): ${locations.map((l) => `${l.name} [${l.id}]`).join(", ")}`)

  const channels = await salesChannel.listSalesChannels({})
  const first = channels[0]
  // Is the first sales channel linked to a stock location?
  const { data: scLinks } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "stock_locations.id", "stock_locations.name"],
    filters: { id: first.id },
  })
  logger.info(
    `SALES CHANNEL ${first.id} stock_locations: ${JSON.stringify(scLinks[0]?.stock_locations ?? [])}`
  )

  // A sample variant's inventory linkage + manage_inventory flag.
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "variants.id",
      "variants.manage_inventory",
      "variants.inventory_items.inventory_item_id",
    ],
    pagination: { take: 1 },
  })
  const p = products[0]
  logger.info(`SAMPLE PRODUCT ${p?.title}: ${JSON.stringify(p?.variants ?? [])}`)
}
