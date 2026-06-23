import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function inspectShipping({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: profs } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name", "type"],
  })
  logger.info("PROFILES: " + JSON.stringify(profs))

  const { data: prods } = await query.graph({
    entity: "product",
    fields: ["title", "shipping_profile.id", "shipping_profile.name"],
    pagination: { take: 3 },
  })
  logger.info(
    "PRODUCT PROFILES: " +
      JSON.stringify(prods.map((p) => ({ t: p.title, sp: p.shipping_profile })))
  )

  const { data: opts } = await query.graph({
    entity: "shipping_option",
    fields: ["name", "shipping_profile.id", "shipping_profile.name", "service_zone.name"],
  })
  logger.info("OPTIONS: " + JSON.stringify(opts))
}
