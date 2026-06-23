import { NextRequest, NextResponse } from "next/server"

import { BACKEND, medusaFetch } from "@/lib/medusa"

// POST /api/auth/login -> session token + customer
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const login = await fetch(`${BACKEND}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const loginData = await login.json()
  if (!login.ok || !loginData.token) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
  }

  const me = await medusaFetch("/store/customers/me", {
    headers: { authorization: `Bearer ${loginData.token}` },
  })
  const meData = await me.json()
  return NextResponse.json({ token: loginData.token, customer: meData.customer })
}
