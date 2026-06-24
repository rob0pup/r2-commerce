import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { AuthWorkflowEvents, Modules } from "@medusajs/framework/utils"

// Sends the password reset email when Medusa emits `auth.password_reset` for
// either an admin user or a storefront customer. The reset link points at the
// admin dashboard's built-in reset page for users, or the storefront for
// customers. Configure MEDUSA_BACKEND_URL / STOREFRONT_URL accordingly.
export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{ entity_id: string; token: string; actor_type: string }>) {
  const notificationModule = container.resolve(Modules.NOTIFICATION)
  const logger = container.resolve("logger")

  const { entity_id: email, token, actor_type } = data
  const isAdmin = actor_type === "user"

  const base =
    (isAdmin ? process.env.MEDUSA_BACKEND_URL : process.env.STOREFRONT_URL) ?? ""
  const path = isAdmin ? "/app/reset-password" : "/account/reset-password"
  const url = `${base}${path}?token=${token}&email=${encodeURIComponent(email)}`

  await notificationModule.createNotifications({
    to: email,
    channel: "email",
    template: "password-reset",
    data: { url, email, isAdmin },
  })

  logger.info(`[email] queued password reset for ${email} (${actor_type})`)
}

export const config: SubscriberConfig = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}
