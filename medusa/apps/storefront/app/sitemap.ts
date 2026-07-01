import type { MetadataRoute } from "next"

const BASE = "https://shop.robinrahman.pro"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/checkout`, changeFrequency: "monthly", priority: 0.3 },
  ]
}
