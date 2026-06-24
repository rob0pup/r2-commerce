import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils"

// Sends an order confirmation email to the customer when an order is placed.
// Uses the query graph so the order totals (calculated fields) are populated.
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationModule = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve("logger")

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "items.title",
      "items.quantity",
      "items.total",
    ],
    filters: { id: data.id },
  })

  if (!order?.email) {
    logger.warn(`[email] order ${data.id} has no email, skipping confirmation`)
    return
  }

  await notificationModule.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    data: {
      displayId: order.display_id,
      currency: (order.currency_code ?? "usd").toUpperCase(),
      total: order.total,
      items: (order.items ?? [])
        .filter(Boolean)
        .map((it: any) => ({
          title: it?.title,
          quantity: it?.quantity,
          total: it?.total,
        })),
    },
  })

  logger.info(`[email] queued order confirmation #${order.display_id} to ${order.email}`)
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
