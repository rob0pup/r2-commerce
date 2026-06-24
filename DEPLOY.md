# Deploying R² Commerce

Three pieces, three homes. The split keeps the storefront fast (Vercel CDN) and
free, while Railway runs only the always-on Medusa server.

```
Shopper ──▶ storefront (Vercel) ──▶ Medusa backend (Railway) ──▶ Neon Postgres + pgvector
                                            │
                                            ├──▶ Upstash Redis (events, cache)   [optional]
                                            ├──▶ Gemini API (embeddings)
                                            ├──▶ Resend (transactional email)    [optional]
                                            └──▶ Stripe (card payments)          [optional]
```

| Piece      | Host                       | Plan / cost                           |
| ---------- | -------------------------- | ------------------------------------- |
| Database   | Neon                       | Free (already provisioned)            |
| Redis      | Upstash                    | Free tier (optional but recommended)  |
| Backend    | Railway                    | Hobby ~$5/mo (always-on)              |
| Storefront | Vercel                     | Hobby free (Pro $20/mo if commercial) |
| Email      | Resend                     | Free tier (3,000/mo, optional)        |
| Domains    | shop / commerce-api        | DNS only (storefront + backend/admin) |

The backend serves **both** the API and the admin dashboard (`/app`) from one
service, so it needs only one domain. Optional integrations (Redis, Resend,
Stripe, Google Analytics) each activate purely by setting their env var — the app
runs without them.

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
4. **(Optional) Resend** — for transactional email. Create an account, verify a
   sending domain, and copy an `re_...` API key. Full walkthrough in
   [Part E](#part-e--email-resend-optional).
5. **(Optional) Stripe** — for card payments. Copy a (test or live) secret key
   `sk_...`. Without it, checkout uses Medusa's built-in manual provider.

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

# Optional — transactional email (see Part E). Without these, Medusa logs
# notifications locally instead of sending them.
RESEND_API_KEY=re_...
RESEND_FROM=R² Commerce <noreply@yourdomain.com>
MEDUSA_BACKEND_URL=https://<your-backend>.up.railway.app   # builds the admin reset link
STOREFRONT_URL=https://<your-storefront>.vercel.app        # builds the customer reset link

# Optional — card payments (see Part F). Without these, checkout uses the
# manual provider. STRIPE_WEBHOOK_SECRET comes from the webhook endpoint.
STRIPE_API_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Set the `<...>` URL placeholders to whatever the live hosts end up being — the
`.up.railway.app` / `.vercel.app` defaults, or your custom domains once they're
live ([Part D](#part-d--custom-domains-optional)). `MEDUSA_BACKEND_URL` and `STOREFRONT_URL`
are only used to build password-reset links, so they can be filled in later.

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

**Seed and set up the store** — the production build doesn't ship the `.ts`
scripts, so these won't run inside the container. Run them from a local clone
pointed at the **production** database (this also indexes the embeddings):

```bash
# in medusa/apps/backend locally, with DATABASE_URL set to the production Neon string
npm run seed                                         # demo products + embeddings
npx medusa exec ./src/scripts/setup-store.ts         # region, sales channel, payment link
npx medusa exec ./src/scripts/setup-inventory.ts     # stock levels (required to add to cart)
npx medusa exec ./src/scripts/setup-checkout.ts      # shipping options + payment provider
npx medusa exec ./src/scripts/link-shipping-profile.ts  # link products to the shipping profile
```

You only do this once. After that, the semantic-search subscriber indexes any
product you add through the admin automatically. The setup scripts make products
fully purchasable end to end (inventory, shipping, and payment are all required for
checkout to complete) — skip them and "add to cart" or "complete order" will fail.

---

## Part B — Storefront → Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import
   `rob0pup/r2-commerce` (grant access to the private repo).
2. **Root Directory:** `medusa/apps/storefront` (Framework auto-detects Next.js).
3. **Environment Variables:**
   ```
   MEDUSA_BACKEND_URL=https://<your-backend>.up.railway.app
   MEDUSA_PUBLISHABLE_KEY=pk_...        # admin → Settings → Publishable API Keys
   MEDUSA_REGION_ID=reg_...             # admin → Settings → Regions (the region's id)
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX       # optional — Google Analytics 4 measurement id
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # optional — enables the card form (Part F)
   ```
4. **Deploy.** Vercel gives you `https://<your-storefront>.vercel.app`.

`MEDUSA_PUBLISHABLE_KEY` must be linked to the sales channel your products are in
(the default key created by `setup-store.ts` already is), or `/store` endpoints
return an empty catalog. `MEDUSA_REGION_ID` selects the pricing region. Grab both
from the admin dashboard. `NEXT_PUBLIC_GA_ID` is optional — leave it unset and
Google Analytics simply doesn't load (Vercel Analytics needs no key and is always
on once deployed to Vercel).

The browser only calls the storefront's own `/api/*` routes, which proxy to the
backend server-side — so there's no public CORS surface from the browser.

---

## Part C — Connect them

1. Back in Railway, set `STORE_CORS` and `AUTH_CORS` to include the real Vercel
   storefront URL, then redeploy (or it restarts on the variable change).
2. Open the storefront URL and run a search. Done.

---

## Part D — Custom domains (optional)

Two subdomains: one for the storefront, one for the backend (which also serves the
admin at `/app`). Example: `shop.robinrahman.pro` + `commerce-api.robinrahman.pro`.

### Storefront (Vercel)

1. Vercel project → **Settings → Domains** → add `shop.robinrahman.pro` and create
   the `CNAME` it shows at your DNS provider. Vercel issues TLS automatically.

### Backend + admin (Railway)

1. Railway → backend service → **Settings → Networking → Custom Domain** → add
   `commerce-api.robinrahman.pro`. When asked for the port, enter **8080**.
2. Railway shows a **CNAME target** (e.g. `abc123.up.railway.app`). Add a `CNAME`
   record at your DNS provider: name `commerce-api`, value that target.
3. Wait for the SSL cert. Until Railway verifies DNS and issues a Let's Encrypt
   cert, hitting the domain shows a `*.up.railway.app` cert and a browser warning —
   this is normal and clears itself in a few minutes (up to ~30). The admin then
   lives at `https://commerce-api.robinrahman.pro/app`.

### Repoint everything at the custom domains

Once both certs are live, update the env vars and redeploy:

```
# Railway backend
ADMIN_CORS=https://commerce-api.robinrahman.pro
AUTH_CORS=https://commerce-api.robinrahman.pro,https://shop.robinrahman.pro
STORE_CORS=https://shop.robinrahman.pro
MEDUSA_BACKEND_URL=https://commerce-api.robinrahman.pro
STOREFRONT_URL=https://shop.robinrahman.pro

# Vercel storefront
MEDUSA_BACKEND_URL=https://commerce-api.robinrahman.pro
```

The `.up.railway.app` and `.vercel.app` URLs keep working too — the custom domains
are additive.

---

## Part E — Email (Resend) (optional)

Transactional email (password resets, order confirmations) goes through
[Resend](https://resend.com) via the `src/modules/resend` notification provider.
It's gated on `RESEND_API_KEY`; without it, Medusa logs notifications locally.

1. **Verify a sending domain.** Resend → **Domains → Add Domain** → e.g.
   `robinrahman.pro`. Add the records it lists (DKIM `TXT`, SPF `TXT`, and an `MX`
   on a `send.` subdomain) at your DNS provider, then **Verify**. Resend scopes its
   `MX`/SPF to the `send.` subdomain, so it won't disturb an existing inbox on the
   apex domain. Until verified, you can only send from `onboarding@resend.dev` to
   your own account email.
2. **Create an API key** → Resend → **API Keys → Create** → copy the `re_...` value.
3. **Set the env vars on the Railway backend** (from Part A) and redeploy:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM=R² Commerce <noreply@robinrahman.pro>
   MEDUSA_BACKEND_URL=https://commerce-api.robinrahman.pro
   STOREFRONT_URL=https://shop.robinrahman.pro
   ```
4. **Test:** go to `…/app/login → Forgot password → Reset`, enter your admin email,
   and check your inbox for the branded reset email. Then place a test order and
   you'll get an order-confirmation email.

---

## Part F — Card payments (Stripe) (optional)

The storefront has a full Stripe card flow (Stripe Elements on the review step).
It activates when the keys are set; otherwise checkout uses the manual provider.

1. **Get your keys** from the Stripe dashboard (test or live):
   - **Secret key** `sk_...` → Railway backend `STRIPE_API_KEY`.
   - **Publishable key** `pk_...` → Vercel storefront `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   Redeploy both. Setting `STRIPE_API_KEY` registers the provider `pp_stripe_stripe`.
2. **Enable Stripe for the region** in the admin: **Settings → Regions →** your USD
   region → **Payment Providers** → check **Stripe (STRIPE)** (the plain one, not the
   Bancontact/iDEAL/etc. variants) → Save. Without this, the Stripe payment session
   is rejected with "provider not enabled in region".
3. **Add the webhook** so capture/refund/failure sync back to Medusa:
   - Stripe → **Developers → Webhooks → Add endpoint** (newer UI: "Event destinations").
   - Endpoint URL:
     ```
     https://<your-backend>/hooks/payment/stripe_stripe
     ```
   - Events: `payment_intent.succeeded`, `payment_intent.amount_capturable_updated`,
     `payment_intent.payment_failed` (and optionally `payment_intent.canceled`).
   - Copy the signing secret `whsec_...` → Railway `STRIPE_WEBHOOK_SECRET` → redeploy.

> **Webhook path is `stripe_stripe`, not `stripe`.** The provider is configured with
> `id: "stripe"`, so its Medusa id is `pp_stripe_stripe`, and the hook route rebuilds
> the provider id as `pp_{path-segment}`. A `…/hooks/payment/stripe` endpoint resolves
> to `pp_stripe` and silently drops every event.

**Test:** add an item, check out to the review step, pay with `4242 4242 4242 4242`
(any future expiry, any CVC, any ZIP). The order appears in admin **Orders**
(Authorized) and Stripe **Transactions** (Uncaptured). Click **Capture payment** in
the admin to capture; the webhook delivery for that capture should return **200**.
Going live: switch Stripe to the live account, swap in `sk_live_`/`pk_live_`, and
create a separate live-mode webhook (sandbox and live webhooks are independent).

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
- **Railway custom-domain limit:** the trial/Hobby plan caps how many custom
  domains a service can have. One backend domain is within the limit; the warning
  about hitting the cap only blocks adding *more*.
- **Resend "from" domain:** you can only send to arbitrary customer addresses once
  your sending domain is verified. Before that, sends are limited to your own
  account email from `onboarding@resend.dev`, so order-confirmation emails to real
  customers will fail until the domain is verified.
- **Admin favicon:** a `postbuild` step (`scripts/patch-admin-favicon.mjs`) patches
  the R² icon into the generated admin `index.html` on every build — no action
  needed, just don't be surprised to see it run after `medusa build`.
