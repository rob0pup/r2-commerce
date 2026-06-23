"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

export type Customer = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
} | null

const TOKEN_KEY = "r2_customer_token"

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

// Header helpers shared by cart/checkout so requests carry the customer token
// (when logged in) and orders attach to the account.
export function authHeaders(): Record<string, string> {
  const t = getToken()
  return t ? { authorization: `Bearer ${t}` } : {}
}
export function authJsonHeaders(): Record<string, string> {
  return { "content-type": "application/json", ...authHeaders() }
}

type AuthContextValue = {
  customer: Customer
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<string | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!getToken()) return
    fetch("/api/auth/me", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.customer) setCustomer(d.customer as Customer)
        else localStorage.removeItem(TOKEN_KEY)
      })
      .catch(() => {})
  }, [])

  // Returns an error string on failure, or null on success.
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const d = await r.json()
      if (!r.ok || !d.token) return d.error ?? "Invalid email or password."
      localStorage.setItem(TOKEN_KEY, d.token)
      setCustomer(d.customer as Customer)
      return null
    } catch {
      return "Something went wrong."
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      setLoading(true)
      try {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, firstName, lastName }),
        })
        const d = await r.json()
        if (!r.ok || !d.token) return d.error ?? "Could not create the account."
        localStorage.setItem(TOKEN_KEY, d.token)
        setCustomer(d.customer as Customer)
        return null
      } catch {
        return "Something went wrong."
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setCustomer(null)
  }, [])

  return (
    <AuthContext.Provider value={{ customer, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
