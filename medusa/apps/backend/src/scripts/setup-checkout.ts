import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

// Make the USD/US region checkout-ready: enable the manual payment provider,
// add a US service zone, and create US shipping options. Mirrors the original
// seed (which only did this for the EUR/Europe region). Idempotent.
export default async function setupCheckout({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const regionModule = container.resolve(Modules.REGION)
  const fulfillment = container.resolve(Modules.FULFILLMENT)

  const regions = await regionModule.listRegions({})
  const usd = regions.find((r) => r.currency_code === "usd")
  if (!usd) {
    logger.error("No USD region")
    return
  }

  // 1. Manual payment provider on the USD region
  try {
    await link.create({
      [Modules.REGION]: { region_id: usd.id },
      [Modules.PAYMENT]: { payment_provider_id: "pp_system_default" },
    })
    logger.info("Linked pp_system_default to USD region")
  } catch (e) {
    logger.info(`Payment link skipped: ${(e as Error).message}`)
  }

  // 2. A US service zone in the existing fulfillment set
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfileId = profiles[0]?.id
  if (!shippingProfileId) {
    logger.error("No shipping profile")
    return
  }

  const { data: sets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name"],
  })
  let usZoneId: string | undefined
  for (const set of sets) {
    const z = (set.service_zones ?? []).find((sz: { name: string }) => sz?.name === "United States")
    if (z) usZoneId = z.id
  }
  if (!usZoneId) {
    const setId = sets[0]?.id
    if (!setId) {
      logger.error("No fulfillment set")
      return
    }
    const zones = await fulfillment.createServiceZones([
      {
        name: "United States",
        fulfillment_set_id: setId,
        geo_zones: [{ country_code: "us", type: "country" }],
      },
    ])
    usZoneId = zones[0].id
    logger.info(`Created US service zone ${usZoneId}`)
  } else {
    logger.info(`US service zone exists ${usZoneId}`)
  }

  // 3. US shipping options (only if the zone has none yet)
  const { data: opts } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "service_zone_id"],
  })
  if (opts.some((o: { service_zone_id?: string }) => o?.service_zone_id === usZoneId)) {
    logger.info("US shipping options already exist")
  } else {
    const rules = [
      { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
      { attribute: "is_return", value: "false", operator: "eq" as const },
    ]
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: usZoneId,
          shipping_profile_id: shippingProfileId,
          type: { label: "Standard", description: "Ships in 2-3 days.", code: "standard" },
          prices: [
            { currency_code: "usd", amount: 8 },
            { region_id: usd.id, amount: 8 },
          ],
          rules,
        },
        {
          name: "Express Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: usZoneId,
          shipping_profile_id: shippingProfileId,
          type: { label: "Express", description: "Ships next business day.", code: "express" },
          prices: [
            { currency_code: "usd", amount: 20 },
            { region_id: usd.id, amount: 20 },
          ],
          rules,
        },
      ],
    })
    logger.info("Created US shipping options (Standard $8, Express $20)")
  }

  logger.info("Checkout setup done")
}
