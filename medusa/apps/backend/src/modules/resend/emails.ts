// Branded HTML email templates for the Resend provider. Plain string templates
// (no React Email) to keep the backend build dependency-free and fast. Each
// template returns the subject plus the rendered HTML for a notification.

type TemplateData = Record<string, unknown>
type TemplateFn = (data: TemplateData) => { subject: string; html: string }

const BRAND = "R² Commerce"
const ACCENT = "#111827"

// Shared shell so every email looks consistent. `preheader` is the hidden
// summary line most inboxes show next to the subject.
function layout(opts: { heading: string; preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${opts.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 32px 12px;">
                <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;color:${ACCENT};">${BRAND}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 0;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${ACCENT};">${opts.heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-size:15px;line-height:1.6;color:#374151;">
                ${opts.body}
              </td>
            </tr>
          </table>
          <div style="max-width:520px;margin:18px auto 0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
            Sent by ${BRAND}. If you were not expecting this email, you can safely ignore it.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a>`
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback
}

function money(v: unknown, currency: string): string {
  const n = Number(v ?? 0)
  return `${currency} ${n.toFixed(2)}`
}

export const emailTemplates: Record<string, TemplateFn> = {
  // Password reset for both admin users and storefront customers.
  "password-reset": (data) => {
    const url = str(data.url, "#")
    const isAdmin = data.isAdmin === true
    const who = isAdmin ? "your admin account" : "your account"
    return {
      subject: `Reset your ${BRAND} password`,
      html: layout({
        heading: "Reset your password",
        preheader: `Reset the password for ${who}.`,
        body: `
          <p style="margin:0 0 18px;">We received a request to reset the password for ${who}. Click the button below to choose a new one. This link expires shortly for your security.</p>
          <p style="margin:0 0 24px;">${button(url, "Reset password")}</p>
          <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">Or paste this link into your browser:<br/>${url}</p>`,
      }),
    }
  },

  // Order confirmation sent to the customer when an order is placed.
  "order-placed": (data) => {
    const displayId = data.displayId ?? ""
    const currency = str(data.currency, "USD")
    const items = Array.isArray(data.items) ? (data.items as TemplateData[]) : []
    const rows = items
      .map(
        (it) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">
              ${str(it.title, "Item")} <span style="color:#9ca3af;">× ${Number(it.quantity ?? 1)}</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;white-space:nowrap;">
              ${money(it.total, currency)}
            </td>
          </tr>`
      )
      .join("")
    return {
      subject: `Your ${BRAND} order #${displayId} is confirmed`,
      html: layout({
        heading: `Thanks for your order!`,
        preheader: `Order #${displayId} is confirmed.`,
        body: `
          <p style="margin:0 0 20px;">Your order <strong>#${displayId}</strong> is confirmed and we are getting it ready. Here is a summary:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
            ${rows}
            <tr>
              <td style="padding:14px 0 0;font-size:15px;font-weight:700;color:#111827;">Total</td>
              <td style="padding:14px 0 0;font-size:15px;font-weight:700;color:#111827;text-align:right;">${money(data.total, currency)}</td>
            </tr>
          </table>
          <p style="margin:22px 0 0;font-size:13px;color:#6b7280;">We will email you again when your order ships.</p>`,
      }),
    }
  },
}
