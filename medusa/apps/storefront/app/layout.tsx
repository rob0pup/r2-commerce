import type { Metadata } from "next"

import "./globals.css"

import { AuthProvider } from "./auth-context"
import { CartProvider } from "./cart-context"
import { CartDrawer } from "./cart-drawer"
import { SiteHeader } from "./site-header"

export const metadata: Metadata = {
  title: "R² Commerce — search by meaning",
  description: "Semantic product search for commerce, powered by Medusa, pgvector, and Gemini.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <SiteHeader />
            {children}
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
