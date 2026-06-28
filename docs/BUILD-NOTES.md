# R² Commerce, Build Notes No. 03

A study companion to how this store is built. R² Commerce is a full
e-commerce stack: a **Medusa v2** backend and a **Next.js** storefront, with
two things most demo stores do not have, **search by meaning** (not keywords)
and **real Stripe card checkout**, wired so the whole thing still runs with
nothing but a database.

Three halves:

1. **How a modern headless commerce stack actually works** (the concepts).
2. **How online card payments actually work** (the part that feels like magic).
3. **How R² Commerce wires it together** (the system, mapped to the code), plus
   the build's war stories.

---

## Part 1. How a headless commerce stack works

### 1.1 "Headless" means the store is split in two

A traditional shop platform (think classic Shopify themes) bundles the
storefront and the business logic together. **Headless** splits them:

- A **backend** exposes commerce as an API: products, carts, orders, customers,
  payments, inventory. It has no opinion about how the site looks.
- A **storefront** is a separate web app that calls that API and renders
  whatever UI you want.

R² Commerce uses **Medusa v2** for the backend and a **Next.js** app for the
storefront. The upside: you can build any front end, swap pieces independently,
and scale them separately. The cost: you wire the two together yourself.

### 1.2 Medusa is built from modules

Medusa's backend is a set of **modules**, each owning one capability: a payment
module, a notification module, a cache module, an event bus, a workflow engine,
and so on. You register the ones you want in one config file. Custom features
(like this store's semantic search) are just more modules.

The important pattern here is **conditional, environment-gated registration**: a
module is only loaded if its credentials exist. No Stripe key, no payment
module (checkout falls back to a manual provider). No Redis URL, the cache and
events run in memory. No Resend key, emails log to the console. This is
**graceful degradation**: the same code runs on a laptop with just a database,
and in production with the full stack, with no separate builds or feature flags.

### 1.3 Search by meaning, not keywords

Normal product search matches text: search "warm jacket" and you only find
products containing those words. R² searches by **meaning** using the same
embedding idea as a recommendation engine:

- Every product is turned into an **embedding** (a vector capturing its meaning)
  with Google Gemini, and stored in Postgres using the **pgvector** extension.
- A search query is embedded the same way, and the database returns the products
  whose vectors are closest (by **cosine similarity**), with a relevance
  threshold to drop weak matches.

So "something for a rainy commute" can surface a waterproof shell that never
contains those words. (For the deeper embeddings explainer, see Build Notes
No. 02.)

### 1.4 The backend is event-driven

Medusa emits events as things happen (`product.created`, `order.placed`,
`auth.password_reset`). **Subscribers** listen and react. This store uses them
to keep the search index fresh (re-embed a product whenever it changes) and to
send email (order confirmations, password resets) without bolting that logic
into the request path.

---

## Part 2. How online card payments actually work

This is the part that feels like magic, and the part with the headline bug, so
it is worth understanding properly.

### 2.1 Your server never touches the card number

You do **not** want raw card numbers flowing through your server (that drags you
into heavy PCI compliance). Stripe's model avoids it entirely:

1. Your backend asks Stripe to start a payment and gets back a **client secret**
   (a one-time token for this specific payment). No card details involved yet.
2. The **browser** collects the card using **Stripe Elements** (an iframe hosted
   by Stripe), and calls `stripe.confirmPayment()` with the client secret. The
   card data goes **straight from the browser to Stripe**, never through your
   server.
3. Stripe processes the charge and tells your backend the result out-of-band, by
   calling a **webhook** (a URL on your server that Stripe POSTs to). The webhook
   is signed with a secret so you can trust it really came from Stripe.

So three parties exchange a token, and the sensitive data takes a shortcut around
your server. Your server only ever sees "payment X succeeded".

### 2.2 The checkout, step by step (in R² Commerce)

The storefront checkout is a small **state machine**: address, then shipping,
then review and pay.

```
address ─► shipping ─► review
                         │  POST /api/checkout/payment-session  ──► Medusa + Stripe ──► client secret
                         │  Stripe Elements card form (themed dark)
                         │  stripe.confirmPayment(clientSecret)   ──► card goes to Stripe directly
                         ▼
                       POST /api/checkout/complete  ──► Medusa turns the cart into an order
                                                         (Stripe webhook confirms payment server-side)
```

---

## Part 3. How R² Commerce wires it together

### 3.1 Shape of the project

A **Turbo monorepo** with two apps:

- `apps/backend` — Medusa v2 (the API, admin dashboard, modules, subscribers).
- `apps/storefront` — Next.js (the shop the customer sees).

### 3.2 Conditional modules (the graceful-degradation pattern)

In `medusa-config.ts`, each integration is added only if its env var is present:

```ts
const paymentModules = process.env.STRIPE_API_KEY
  ? [{ resolve: "@medusajs/medusa/payment", options: { providers: [
      { resolve: "@medusajs/medusa/payment-stripe", id: "stripe",
        options: { apiKey: STRIPE_API_KEY, webhookSecret: STRIPE_WEBHOOK_SECRET } } ] } }]
  : []
// same shape for Redis (cache/events/workflow) and Resend (email)
```

One codebase, many environments. Nothing to toggle.

### 3.3 Semantic search as its own module

The search lives in a custom module with its **own Postgres connection pool and
raw SQL**, because Medusa's data layer has no native `vector` type. It keeps a
`product_embedding` table (`vector(768)`) with an **HNSW index** for fast
nearest-neighbor lookup, and embeds with Gemini. Indexing is **subscriber
driven**: when a product is created or updated, a subscriber re-embeds it
automatically; when deleted, another removes it. A public `GET /semantic-search`
endpoint serves results (rate-limited), and the storefront calls it through a
server-side proxy.

### 3.4 The storefront hides the backend

The storefront never calls Medusa directly from the browser. Every request goes
through a **Next.js API route** that proxies to Medusa. That keeps the backend
URL and publishable key server-side, sidesteps CORS, and gives one place to add
logging or limits. Cart state is split: a cart ID in the browser's localStorage,
the cart itself in Medusa, reconciled on login and at checkout.

### 3.5 Email without a frontend dependency

The Resend notification module sends **plain HTML** templates (order
confirmation, password reset), with no React Email or template engine, so the
backend stays light. Unknown template names are logged rather than thrown, so a
new event can never break the email path.

### 3.6 Deployment

```
shopper ─► storefront (Vercel) ─► backend (Railway) ─► Neon Postgres + pgvector
                                          ├─► Gemini  (embeddings)
                                          ├─► Resend  (email)
                                          ├─► Stripe  (payments)
                                          └─► Upstash Redis (optional)
```

The Railway build compiles Medusa to a standalone server under `.medusa/server`,
runs database migrations on every deploy (`predeploy`), then starts.

### 3.7 Where it lives

| Concern | Path |
| --- | --- |
| Conditional module config | `apps/backend/medusa-config.ts` |
| Semantic search module | `apps/backend/src/modules/semantic-search/` |
| Search endpoint | `apps/backend/src/api/semantic-search/route.ts` |
| Auto-index / email subscribers | `apps/backend/src/subscribers/*` |
| Resend module + templates | `apps/backend/src/modules/resend/` |
| Storefront checkout | `apps/storefront/app/checkout/` |
| Stripe Elements form | `apps/storefront/app/checkout/stripe-payment.tsx` |
| Storefront API proxies | `apps/storefront/app/api/*` |
| Deploy guide | `DEPLOY.md` |

---

## Part 4. Challenges, and how they were solved

### 4.1 Headline: where is the Stripe webhook URL?

**Symptom.** Card payments worked in the browser, but the backend needed
Stripe's webhook to confirm them server-side, and there was no obvious URL to
give Stripe. The docs say "configure your webhook endpoint" without saying what
it is.

**Diagnosis.** Medusa derives the webhook path from the **provider id**. The
Stripe provider is registered with `id: "stripe"`, which Medusa internally names
`pp_stripe_stripe` (the `pp_` payment-provider prefix plus the provider and the
id). The webhook path is built from that.

**Fix.** Point the Stripe dashboard webhook at:

```
https://<backend>.up.railway.app/hooks/payment/stripe_stripe
```

and set `STRIPE_WEBHOOK_SECRET` to the signing secret Stripe shows for that
endpoint. Once both matched, the order completed server-side reliably.

**Lesson.** Convention-derived URLs are invisible until you know the convention.
The provider id is the key to the path.

### 4.2 The strict build catches what the lenient one misses

A TypeScript error slipped through during development because `medusa exec`
(used to run scripts) is **lenient**, it ran the file despite the type error.
The real production build, `medusa build`, is **strict** and failed on Railway.

**Lesson, now a standing rule:** run the *deploy's* strict build locally before
pushing (`medusa build` / `next build` / `tsc --noEmit`), not just the lenient
dev command. The build that ships is the one that must be green.

### 4.3 React types fighting across the monorepo

Medusa's admin pulls React 18 types; other packages tried to hoist React 19
types, and the mismatch broke the admin types. The fix was to **pin
`@types/react` and `@types/react-dom` in the workspace overrides**, then delete
the lockfile and reinstall so the pin actually took. A reminder that in a
monorepo, transitive type versions need an explicit hand.

### 4.4 Neon must be the direct connection, not the pooled one

Medusa uses prepared statements, which the pooled (PgBouncer) Neon connection
does not support. Using the pooled URL produces confusing runtime errors. The
fix is to use Neon's **direct** connection string (port 5432), and to enable the
`pgvector` extension for the semantic search table.

### 4.5 Two smaller deploy gotchas

- The standalone server under `.medusa/server` needs its own `npm install`, and
  Medusa's many optional peer dependencies make it fail unless
  `NPM_CONFIG_LEGACY_PEER_DEPS=true` is set on Railway.
- Stripe Elements defaults to a light theme that clashed with the dark
  storefront; it is themed explicitly (`theme: "night"` plus custom colors) to
  match.

---

## Part 5. Stack and glossary

**Stack:** Medusa v2 (backend) · Next.js 15 (storefront) · Turbo monorepo · npm
· PostgreSQL + pgvector (Neon) · Google Gemini embeddings · Stripe · Resend ·
Upstash Redis (optional) · backend on Railway, storefront on Vercel.

**Glossary**
- **Headless commerce:** a commerce backend exposed as an API, with a separate
  storefront app on top.
- **Module (Medusa):** a self-contained backend capability (payment, email,
  cache, search) registered in config.
- **Graceful degradation:** the app runs with fewer features when optional
  services are absent, instead of failing.
- **Embedding / pgvector / cosine similarity:** numeric meaning vectors, a
  Postgres extension to store and search them, and the closeness measure. See
  No. 02.
- **HNSW index:** an index that makes nearest-vector search fast (roughly
  logarithmic instead of scanning everything).
- **Subscriber:** code that reacts to a backend event (e.g. re-index a product
  on update).
- **Client secret (Stripe):** a one-time token that lets the browser confirm a
  specific payment directly with Stripe.
- **Webhook:** a URL Stripe calls to tell your server a payment's outcome,
  signed so you can trust it.
- **Provider id (`pp_stripe_stripe`):** Medusa's internal name for the Stripe
  payment provider; it determines the webhook path.

---

*Build Notes No. 03. Built by Robin. Part of a series, see No. 01 (Squish) and
No. 02 (Portfolio).*
