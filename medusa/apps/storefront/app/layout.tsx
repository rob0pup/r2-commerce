import { GoogleAnalytics } from "@next/third-parties/google"
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"

import "./globals.css"

import { AuthProvider } from "./auth-context"
import { CartProvider } from "./cart-context"
import { CartDrawer } from "./cart-drawer"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"
import { ViewBeacon } from "./view-beacon"

const title = "R² Commerce — search by meaning"
const description =
  "Semantic product search for commerce, powered by Medusa, pgvector, and Gemini. An open-source demo storefront."

export const metadata: Metadata = {
  metadataBase: new URL("https://shop.robinrahman.pro"),
  title: {
    default: title,
    template: "%s · R² Commerce",
  },
  description,
  applicationName: "R² Commerce",
  keywords: [
    "semantic search",
    "product search",
    "vector search",
    "pgvector",
    "medusa",
    "gemini embeddings",
    "ecommerce demo",
    "open source storefront",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "R² Commerce",
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
        <Analytics />
        <ViewBeacon />
        {/* Live demo of R² Lookup semantic search (a separate SaaS). Set
            NEXT_PUBLIC_LOOKUP_STORE to the demo store id to show the widget. */}
        {process.env.NEXT_PUBLIC_LOOKUP_STORE && (
          <script
            src="https://lookup.robinrahman.pro/widget.js"
            data-store={process.env.NEXT_PUBLIC_LOOKUP_STORE}
            defer
          />
        )}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  )
}
