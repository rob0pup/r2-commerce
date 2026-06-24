import { emailTemplates } from "../emails"

describe("emailTemplates", () => {
  it("password-reset embeds the reset URL", () => {
    const url = "https://shop.example/account/reset-password?token=abc&email=a%40b.com"
    const { subject, html } = emailTemplates["password-reset"]({ url, isAdmin: false })
    expect(subject).toMatch(/reset/i)
    expect(html).toContain(url)
  })

  it("order-placed lists items and the formatted total", () => {
    const { subject, html } = emailTemplates["order-placed"]({
      displayId: 42,
      currency: "USD",
      total: 67,
      items: [{ title: "Insulated Water Bottle", quantity: 2, total: 40 }],
    })
    expect(subject).toContain("42")
    expect(html).toContain("Insulated Water Bottle")
    expect(html).toContain("USD 67.00")
  })

  it("registers exactly the known templates", () => {
    expect(Object.keys(emailTemplates).sort()).toEqual(["order-placed", "password-reset"])
  })
})
