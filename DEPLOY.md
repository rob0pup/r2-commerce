# Deploying R² Commerce

Three pieces, three homes. The split keeps the storefront fast (Vercel CDN) and
free, while Railway runs only the always-on Medusa server.

```
Shopper ──▶ storefront (Vercel) ──▶ Medusa backend (Railway) ──▶ Neon Postgres + pgvector
                                            │
                                            ├──▶ Upstash Redis (events, cache) [optional]
                                            └──▶ Gemini API (embeddings)
```

| Piece      | Host                 | Plan / cost                           |
| ---------- | -------------------- | ------------------------------------- |
| Database   | Neon                 | Free (already provisioned)            |
| Redis      | Upstash              | Free tier (optional but recommended)  |
| Backend    | Railway              | Hobby ~$5/mo (always-on)              |
| Storefront | Vercel               | Hobby free (Pro $20/mo if commercial) |
| Domain     | shop.robinrahman.pro | DNS only                              |

Build/start commands below are verified against this repo (Medusa 2.16, monorepo).

---

## Before you start

1. **Generate two production secrets** (don't reuse the dev `supersecret`):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # COOKIE_SECRET
   ```
2. **Neon connection string** — use the **direct** (non-pooled) one. Medusa uses
   prepared statements that break on PgBouncer pooled endpoints.
3. **(Optional) Upstash Redis** — create a free database, copy its `rediss://` URL.
   Skip for a first deploy; Medusa falls back to in-memory (single instance only).

---

## Part A — Backend → Railway

### 1. Create the service

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Grant Railway access to the **private** `rob0pup/r2-commerce` repo, then select it.

### 2. Settings → Build & Deploy

| Setting            | Value                                                            |
| ------------------ | --------------------------------------------------------------- |
| **Root Directory** | `medusa/apps/backend`                                           |
| **Build Command**  | `npm install && npm run build && cd .medusa/server && npm install` |
| **Start Command**  | `cd .medusa/server && npm run predeploy && npm run start`       |
| **Healthcheck Path** | `/health`                                                     |

- `medusa build` compiles into `.medusa/server` (a standalone server).
- `npm run predeploy` runs `medusa db:migrate` on every deploy, so migrations
  always run before the server boots.

### 3. Variables

```
DATABASE_URL=postgres://...              # Neon DIRECT (non-pooled)
GOOGLE_GENERATIVE_AI_API_KEY=...
JWT_SECRET=<generated above>
COOKIE_SECRET=<generated above>

# CORS — fill the storefront URL in after Part B (use a placeholder for now)
STORE_CORS=https://<your-storefront>.vercel.app
ADMIN_CORS=https://<your-backend>.up.railway.app
AUTH_CORS=https://<your-backend>.up.railway.app,https://<your-storefront>.vercel.app

# Required — the Medusa scaffold has peer-dep mismatches; this lets every npm
# install in the build (incl. the generated .medusa/server) resolve them.
NPM_CONFIG_LEGACY_PEER_DEPS=true

# Optional (recommended for production)
REDIS_URL=rediss://...                   # Upstash
```

Railway injects `PORT` automatically (8080) and Medusa binds to it — do **not**
hardcode 9000. `MEDUSA_WORKER_MODE` defaults to `shared` (API + worker in one
service) — fine for this size.

### 4. Get the backend URL

Railway **service → Settings → Networking → Public Networking → Generate Domain**.
When it asks for a port, accept the detected **8080** (the port Medusa bound to via
Railway's `PORT`). That's your `https://<your-backend>.up.railway.app`. Put it in
`ADMIN_CORS` / `AUTH_CORS` above.

### 5. Migrations, admin user, and demo data

Migrations run automatically on every deploy via `predeploy` (`medusa db:migrate`).

**Create an admin user** in the running container. Easiest is the service's
**Console** tab in the Railway dashboard (a web shell into the container); or
`railway ssh` from a local machine with the Railway CLI installed (`npm i -g
@railway/cli && railway login && railway link`). Then:

```bash
cd .medusa/server
npm run user -- -e you@example.com -p yourpassword
```

The admin dashboard is then at `https://<your-backend>.up.railway.app/app`.

**Seed demo products** — the production build doesn't ship the seed script's
`.ts` source, so `npm run seed` won't run inside the container. Instead run it
from a local clone pointed at the production database (this is what indexes the
embeddings too):

```bash
# in medusa/apps/backend locally, with DATABASE_URL set to the production Neon string
npm run seed
```

You only do this once for the demo catalog — after that, the semantic-search
subscriber indexes any product you add through the admin automatically.

---

## Part B — Storefront → Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import
   `rob0pup/r2-commerce` (grant access to the private repo).
2. **Root Directory:** `medusa/apps/storefront` (Framework auto-detects Next.js).
3. **Environment Variable:**
   ```
   MEDUSA_BACKEND_URL=https://<your-backend>.up.railway.app
   ```
4. **Deploy.** Vercel gives you `https://<your-storefront>.vercel.app`.

The browser only calls the storefront's own `/api/search` route, which proxies to
the backend server-side — so there's no public CORS surface from the browser.

---

## Part C — Connect them

1. Back in Railway, set `STORE_CORS` and `AUTH_CORS` to include the real Vercel
   storefront URL, then redeploy (or it restarts on the variable change).
2. Open the storefront URL and run a search. Done.

---

## Part D — Custom domain (optional)

1. Vercel project → **Settings → Domains** → add `shop.robinrahman.pro` and set the
   CNAME it shows at your DNS provider.
2. Update Railway `STORE_CORS` / `AUTH_CORS` to use the custom domain.

---

## Notes & gotchas

- **Neon scale-to-zero:** the first request after idle has a ~1s cold start. Fine
  for a demo; a paid Neon plan or a keep-warm ping removes it.
- **Public search route:** `/semantic-search` is unauthenticated. Before real
  traffic, move it under `/store` (publishable key) or add rate limiting.
- **Vercel auto-import:** if Vercel ever auto-creates a project for this repo with
  the wrong root, delete it and re-add with Root Directory `medusa/apps/storefront`.
- **Redis:** optional. Without `REDIS_URL` the backend logs "Local Event Bus … not
  recommended for production" and runs in-memory — fine for a single instance. If
  you add it, `REDIS_URL` **must** be a full `rediss://default:<pass>@<host>.upstash.io:6379`
  string (Upstash → Connect → Node). A missing scheme or wrong value makes ioredis
  fall back to `localhost:6379`, which floods errors and stops the server from ever
  passing its healthcheck.
