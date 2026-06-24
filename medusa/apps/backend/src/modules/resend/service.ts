import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { Resend } from "resend"

import { emailTemplates } from "./emails"

type InjectedDependencies = {
  logger: Logger
}

type Options = {
  apiKey: string
  from: string
}

// Resend notification provider for the email channel. Templates are resolved
// from the local registry by name; the `data` on each notification feeds the
// template. Unknown templates are skipped (logged) rather than throwing, so a
// new event never breaks the flow that emitted it.
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected logger_: Logger
  protected options_: Options
  protected client_: Resend

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    this.logger_ = logger
    this.options_ = options
    this.client_ = new Resend(options.apiKey)
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider requires an `apiKey` option."
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider requires a `from` option."
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = emailTemplates[notification.template]
    if (!template) {
      this.logger_.warn(
        `[resend] no template registered for "${notification.template}", skipping send`
      )
      return {}
    }

    const { subject, html } = template(notification.data ?? {})

    const { data, error } = await this.client_.emails.send({
      from: notification.from ?? this.options_.from,
      to: notification.to,
      subject,
      html,
    })

    if (error) {
      this.logger_.error(
        `[resend] failed to send "${notification.template}" to ${notification.to}: ${error.message}`
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend failed to send email: ${error.message}`
      )
    }

    this.logger_.info(
      `[resend] sent "${notification.template}" to ${notification.to} (${data?.id})`
    )
    return { id: data?.id }
  }
}

export default ResendNotificationProviderService
