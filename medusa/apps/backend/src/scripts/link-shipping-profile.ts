import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Products created via createProductsWorkflow weren't linked to a shipping
// profile, so checkout can't match them to a shipping method. Link every
// product to the default profile. Idempotent.
export default async function linkShippingProfile({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "type"],
  })
  const profile = profiles.find((p) => p?.type === "default") ?? profiles[0]
  if (!profile?.id) {
    logger.error("No shipping profile found")
    return
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "shipping_profile.id"],
    pagination: { take: 200 },
  })

  let linked = 0
  let skipped = 0
  for (const p of products) {
    if (p?.shipping_profile?.id) {
      skipped++
      continue
    }
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: p.id },
        [Modules.FULFILLMENT]: { shipping_profile_id: profile.id },
      })
      linked++
    } catch {
      skipped++
    }
  }
  logger.info(`Shipping profile linked: ${linked}, skipped ${skipped}`)
}
