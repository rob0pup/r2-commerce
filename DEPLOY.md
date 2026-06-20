# Deploying R² Commerce

Three pieces, three homes. The split keeps the storefront fast (Vercel CDN) and
cheap (free tier) while Railway runs only the always-on Medusa server.

```
Shopper ──▶ storefront (Vercel)  ──▶ Medusa backend (Railway) ──▶ Neon Postgres + pgvector
                                              │
                                              └──▶ Upstash Redis (events, cache)
                                              └──▶ Gemini API (embeddings)
```

| Piece      | Host             | Plan / cost                          |
| ---------- | ---------------- | ------------------------------------ |
| Database   | Neon             | Free (already provisioned)           |
| Redis      | Upstash          | Free tier                            |
| Backend    | Railway          | Hobby ~$5/mo (always-on)             |
| Storefront | Vercel           | Hobby free (Pro $20/mo if commercial)|
| Domain     | shop.robinrahman.pro | DNS only                         |

## 1. Backend → Railway

1. New Railway project → Deploy from GitHub repo `rob0pup/r2-commerce`.
2. Root directory: `medusa/apps/backend`. Build: `npm run build`. Start: `npm run start`.
3. Environment variables:
   - `DATABASE_URL` — Neon **direct** connection string (not pooled; Medusa uses
     prepared statements that break on PgBouncer).
   - `REDIS_URL` — Upstash Redis URL (create a free database, copy the `rediss://` URL).
   - `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini key.
   - `JWT_SECRET`, `COOKIE_SECRET` — fresh random strings (not the dev `supersecret`).
   - `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` — set to the storefront origin
     (`https://shop.robinrahman.pro`) once it exists.
4. Wire Redis into `medusa-config.ts` for production (event bus + cache + workflow
   engine modules) so events survive restarts. Local dev still falls back to
   in-memory when `REDIS_URL` is unset.
5. First deploy: run `medusa db:migrate`, then `medusa exec ./src/scripts/seed-products.ts`
   (Railway one-off command or a release step), then create an admin user with
   `medusa user -e you@domain -p ...`.

## 2. Storefront → Vercel

1. New Vercel project → import `rob0pup/r2-commerce`.
2. Root directory: `medusa/apps/storefront`. Framework preset: Next.js.
3. Environment variable: `MEDUSA_BACKEND_URL` = the Railway backend URL
   (e.g. `https://r2-commerce-backend.up.railway.app`).
4. The browser only ever talks to the Next server route `/api/search`, which
   proxies to the backend — so no public CORS surface and the backend URL stays
   server-side.

## 3. Domain

- `shop.robinrahman.pro` → Vercel (CNAME to the Vercel project). Storefront only.
- Backend can stay on its Railway URL, or get `api.robinrahman.pro` if a clean
  public API host is wanted.

## Notes

- Neon scales to zero when idle; the first request after a quiet spell has a ~1s
  cold start. Fine for a demo; a paid Neon plan or a keep-warm ping removes it.
- The semantic-search route is currently unauthenticated and public. Before any
  real traffic, move it under `/store` (publishable key) or add rate limiting.
