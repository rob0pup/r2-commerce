import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// The default seed ships Medusa-branded demo merch; drop it so the catalog is
// just our products.
const DEMO_PREFIX = "Medusa "

// Clean, on-brand placeholder until real product photos are added.
function imageFor(title: string) {
  return `https://placehold.co/800x800/0a0a0a/ededed/png?text=${encodeURIComponent(
    title
  )}`
}

export default async function setupStore({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const regionModule = container.resolve(Modules.REGION)
  const productModule = container.resolve(Modules.PRODUCT)

  // 1. Ensure a USD region exists (our prices are USD).
  const regions = await regionModule.listRegions({})
  let usd = regions.find((r) => r.currency_code === "usd")
  if (!usd) {
    ;[usd] = await regionModule.createRegions([
      { name: "United States", currency_code: "usd", countries: ["us"] },
    ])
    logger.info(`Created USD region ${usd.id}`)
  } else {
    logger.info(`USD region exists ${usd.id}`)
  }

  // 2. Use the first sales channel + publishable key; make sure they're linked.
  const channel = (await salesChannelModule.listSalesChannels({}))[0]
  const key = (await apiKeyModule.listApiKeys({ type: "publishable" }))[0]
  try {
    await link.create({
      [Modules.API_KEY]: { publishable_key_id: key.id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: channel.id },
    })
    logger.info("Linked publishable key to sales channel")
  } catch {
    logger.info("Publishable key already linked to channel")
  }

  // 3. Drop the demo merch, configure our products.
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "sales_channels.id"],
    pagination: { take: 200 },
  })

  const demo = products.filter((p) => p.title.startsWith(DEMO_PREFIX))
  if (demo.length) {
    await productModule.deleteProducts(demo.map((d) => d.id))
    logger.info(`Removed ${demo.length} demo products`)
  }

  const ours = products.filter((p) => !p.title.startsWith(DEMO_PREFIX))
  let linked = 0
  let imaged = 0
  for (const p of ours) {
    const inChannel = (p.sales_channels ?? []).some((sc) => sc.id === channel.id)
    if (!inChannel) {
      await link.create({
        [Modules.PRODUCT]: { product_id: p.id },
        [Modules.SALES_CHANNEL]: { sales_channel_id: channel.id },
      })
      linked++
    }
    if (!p.thumbnail) {
      await productModule.updateProducts(p.id, {
        thumbnail: imageFor(p.title),
        images: [{ url: imageFor(p.title) }],
      })
      imaged++
    }
  }

  logger.info(`Products: ${ours.length} total, linked ${linked}, imaged ${imaged}`)
  logger.info(
    `STOREFRONT_ENV region=${usd.id} channel=${channel.id} key=${key.token}`
  )
}
