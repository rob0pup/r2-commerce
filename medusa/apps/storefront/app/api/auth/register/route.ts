import { NextRequest, NextResponse } from "next/server"

import { BACKEND, medusaFetch } from "@/lib/medusa"

// POST /api/auth/register -> register identity, create the customer, log in.
export async function POST(req: NextRequest) {
  const { email, password, firstName, lastName } = await req.json()

  // 1. Register an auth identity (no publishable key needed for /auth).
  const reg = await fetch(`${BACKEND}/auth/customer/emailpass/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const regData = await reg.json()
  if (!reg.ok || !regData.token) {
    return NextResponse.json(
      { error: regData.message ?? "That email may already be registered." },
      { status: 400 }
    )
  }

  // 2. Create the customer record with the registration token.
  await medusaFetch("/store/customers", {
    method: "POST",
    headers: { authorization: `Bearer ${regData.token}` },
    body: JSON.stringify({ email, first_name: firstName, last_name: lastName }),
  })

  // 3. Log in to get a session token + the customer.
  const login = await fetch(`${BACKEND}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const loginData = await login.json()
  if (!login.ok || !loginData.token) {
    return NextResponse.json({ error: "Account created — please log in." }, { status: 400 })
  }
  const me = await medusaFetch("/store/customers/me", {
    headers: { authorization: `Bearer ${loginData.token}` },
  })
  const meData = await me.json()
  return NextResponse.json({ token: loginData.token, customer: meData.customer })
}
