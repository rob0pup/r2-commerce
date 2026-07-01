import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/checkout", "/api"] },
    sitemap: "https://shop.robinrahman.pro/sitemap.xml",
    host: "https://shop.robinrahman.pro",
  }
}
