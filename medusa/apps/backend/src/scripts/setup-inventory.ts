import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Stock the catalog: create an inventory level for every variant at the
// warehouse. Without a level, the cart rejects the variant ("no stock location
// for variant"). Quantities are varied so the storefront can show real stock
// (incl. a few low-stock items).
export default async function setupInventory({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const stockLocation = container.resolve(Modules.STOCK_LOCATION)
  const inventory = container.resolve(Modules.INVENTORY)

  const [loc] = await stockLocation.listStockLocations({})
  if (!loc) {
    logger.error("No stock location found")
    return
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["title", "variants.inventory_items.inventory_item_id"],
    pagination: { take: 200 },
  })

  let created = 0
  let skipped = 0
  let i = 0
  for (const p of products) {
    for (const v of p.variants ?? []) {
      for (const ii of v?.inventory_items ?? []) {
        const inventoryItemId = ii?.inventory_item_id
        if (!inventoryItemId) continue
        i++
        const qty = ((i * 37) % 180) + 6 // varied 6..185
        try {
          await inventory.createInventoryLevels([
            {
              inventory_item_id: inventoryItemId,
              location_id: loc.id,
              stocked_quantity: qty,
            },
          ])
          created++
        } catch {
          skipped++ // level already exists
        }
      }
    }
  }
  logger.info(`Inventory levels at ${loc.name}: created ${created}, skipped(existing) ${skipped}`)
}
