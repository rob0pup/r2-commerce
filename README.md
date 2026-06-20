# R² Commerce

**Semantic product search for commerce — search by meaning, not keywords.**

Type what you actually want ("warm layer for a freezing hike", "make good coffee
at home") and get the right products back, even when none of those words appear in
the product. It's built as a real [Medusa v2](https://medusajs.com) module backed
by Postgres + [pgvector](https://github.com/pgvector/pgvector) and
[Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings), with a small
Next.js storefront on top.

> Keyword search matches strings. This matches *intent*. "Quiet focus in a loud
> office" returns noise-cancelling headphones; "keep my lunch cold all day" returns
> the insulated bottle — by meaning, with a relevance cutoff so weak matches are
> dropped instead of padding the list.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start — the standalone engine](#quick-start--the-standalone-engine)
- [Full stack — Medusa backend + storefront](#full-stack--medusa-backend--storefront)
- [The search API](#the-search-api)
- [How auto-indexing works](#how-auto-indexing-works)
- [Tech stack](#tech-stack)
- [Deployment](#deployment)
- [Limitations & roadmap](#limitations--roadmap)
- [Credits](#credits)

---

## Why this exists

Most store search is keyword search: it only finds products whose text literally
contains your words. Shoppers don't think in product titles — they describe a need.
Semantic search closes that gap by comparing the *meaning* of the query to the
*meaning* of each product, so descriptive, natural-language queries work.

This repo is a complete, working reference for adding that to a Medusa store:
the embedding pipeline, the vector index, the auto-reindexing on product changes,
a clean search API, and a storefront that consumes it.

## How it works

1. **Embed.** Each product's `title + description` is sent to Gemini
   (`gemini-embedding-001`) and turned into a 768-dimensional vector — a numeric
   fingerprint of its meaning. The vector is stored in Postgres in a
   `product_embedding` table using the `vector` column type from pgvector.
2. **Index.** An [HNSW](https://github.com/pgvector/pgvector#hnsw) index with
   `vector_cosine_ops` makes nearest-neighbour lookups fast.
3. **Search.** A query is embedded the same way (with the `RETRIEVAL_QUERY` task
   type instead of `RETRIEVAL_DOCUMENT`), then products are ranked by **cosine
   similarity** using pgvector's `<=>` distance operator:

   ```sql
   SELECT product_id, 1 - (embedding <=> $1::vector) AS score
   FROM product_embedding
   ORDER BY embedding <=> $1::vector
   LIMIT $2;
   ```
4. **Filter.** Results below a similarity **threshold** (default `0.62`) are
   dropped, so a nonsense query returns "no strong matches" rather than the nearest
   of a bad bunch.

That's the whole idea. The rest is plumbing to keep the index in sync with the
store and to expose it cleanly.

## Architecture

```
                       ┌──────────────────────────────┐
  Shopper ─── query ──▶│  Storefront (Next.js, :8000) │
                       │   /api/search  (server proxy)│   no CORS, hides backend URL
                       └───────────────┬──────────────┘
                                       │ HTTP
                                       ▼
                       ┌──────────────────────────────┐
                       │  Medusa backend (:9000)       │
                       │   GET /semantic-search?q=...  │
                       │   semantic-search module      │──┐
                       │   product.* subscribers       │  │ embed()
                       └───────────────┬──────────────┘  │
                                       │                  ▼
                       ┌───────────────┴───────┐   ┌──────────────┐
                       │ Postgres + pgvector    │   │  Gemini API  │
                       │  product_embedding     │   │  embeddings  │
                       │  (HNSW cosine index)   │   └──────────────┘
                       └────────────────────────┘
```

A shopper only ever talks to the Next.js server route `/api/search`, which proxies
to the backend. That keeps the browser same-origin (no CORS) and the backend URL
server-side.

## Repository layout

```
r2-commerce/
├── src/                      # Standalone engine (CLI) — the minimal reference
│   ├── catalog.ts            #   demo product list
│   ├── embed.ts              #   Gemini embedding + pgvector literal helper
│   ├── db.ts                 #   pg pool + schema (extension, table, HNSW index)
│   ├── index-catalog.ts      #   `pnpm index`  — embed + upsert the catalog
│   └── search.ts             #   `pnpm search` — embed a query, rank by cosine
│
├── medusa/                   # The real thing: a Medusa v2 monorepo (Turborepo)
│   └── apps/
│       ├── backend/          # Medusa server
│       │   └── src/
│       │       ├── modules/semantic-search/   # the module (service + embed + schema)
│       │       ├── subscribers/               # product.created/updated/deleted → (re)index
│       │       ├── api/semantic-search/        # GET /semantic-search route
│       │       └── scripts/                    # seed-products, reindex (medusa exec)
│       └── storefront/       # Next.js search UI + /api/search proxy
│
├── DEPLOY.md                 # Railway + Vercel + Neon + Upstash, step by step
└── README.md
```

The **standalone engine** (`src/`) is the easiest way to see the core idea in
isolation. The **Medusa stack** (`medusa/`) is the production-shaped version where
the same idea is a module that auto-syncs with the store.

## Prerequisites

- **Node.js 20+** (the engine is tested on 22).
- A **Postgres database with the `vector` extension available.**
  [Neon](https://neon.tech) free tier works out of the box (`CREATE EXTENSION
  vector` succeeds) and is what `DEPLOY.md` assumes.
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey).

> **Connection string note:** Medusa uses prepared statements, which break on
> PgBouncer-style pooled endpoints. Use Neon's **direct** (non-pooled) connection
> string for the Medusa backend. The standalone engine works with either.

## Quick start — the standalone engine

The fastest way to see semantic search working, no Medusa required.

```bash
# from the repo root
cp .env.example .env          # Windows: copy .env.example .env
#   DATABASE_URL=postgres://...        (your Neon string)
#   GOOGLE_GENERATIVE_AI_API_KEY=...   (Google AI Studio)

pnpm install
pnpm index                     # embeds the demo catalog into pgvector
pnpm search "something for a rainy commute"
pnpm search "make good coffee at home"
pnpm search "quiet focus in a loud office"
```

`.env.local` is also read if you prefer it. Example output:

```
Query: "something for a rainy commute"

1. Waterproof Commuter Backpack  ($89)  0.719
2. Noise-Cancelling Headphones   ($249) 0.627
3. Wireless Earbuds              ($99)  0.611
```

## Full stack — Medusa backend + storefront

The Medusa monorepo lives in `medusa/` and uses **npm**.

### 1. Install

```bash
cd medusa
npm install
```

### 2. Configure the backend

The backend reads its env from `medusa/apps/backend/.env`. The scaffold creates one
with `JWT_SECRET`, CORS, etc. Add your database and Gemini key:

```bash
# medusa/apps/backend/.env
DATABASE_URL=postgres://...        # Neon DIRECT (non-pooled) connection string
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### 3. Migrate, seed, and create an admin

```bash
cd medusa/apps/backend

# create all Medusa tables (and the product_embedding table on first search)
npm run db:migrate

# create demo products (with prices) and embed them
npm run seed

# optional: re-embed every existing product (after model/schema changes)
npm run reindex

# create an admin login for the dashboard
npm run user -- -e you@example.com -p yourpassword
```

### 4. Run

```bash
# from medusa/apps/backend
npm run dev                 # backend + admin on http://localhost:9000  (admin at /app)
```

```bash
# from medusa/apps/storefront, in another terminal
npm run dev                 # storefront on http://localhost:8000
```

The storefront proxies to the backend at `http://localhost:9000` by default; set
`MEDUSA_BACKEND_URL` in `medusa/apps/storefront/.env.local` to point elsewhere.

Open **http://localhost:8000**, type a phrase, and watch products rank by meaning.
Add or edit a product in the admin (`:9000/app`) and it becomes searchable
automatically — see below.

## The search API

```
GET /semantic-search?q=<query>&threshold=<0..1>&limit=<n>
```

| Param       | Default | Notes                                              |
| ----------- | ------- | -------------------------------------------------- |
| `q`         | —       | Required. Natural-language query.                  |
| `threshold` | `0.62`  | Minimum cosine similarity to count as a match.     |
| `limit`     | `8`     | Max results (capped at 20).                        |

Example:

```bash
curl "http://localhost:9000/semantic-search?q=warm%20layer%20for%20a%20freezing%20hike"
```

```json
{
  "query": "warm layer for a freezing hike",
  "threshold": 0.62,
  "count": 2,
  "results": [
    { "id": "prod_...", "title": "Merino Wool Base Layer", "description": "...", "price": 64,  "score": 0.7436 },
    { "id": "prod_...", "title": "Packable Down Jacket",   "description": "...", "price": 159, "score": 0.6988 }
  ]
}
```

`price` is the lowest USD variant price (or `null` if the product has none),
resolved through Medusa's product→pricing module link. `score` is cosine
similarity in `0..1`.

## How auto-indexing works

The index stays in sync with the store through Medusa **subscribers** — no manual
reindexing in normal use:

| Event                              | Subscriber           | Action                                  |
| ---------------------------------- | -------------------- | --------------------------------------- |
| `product.created`, `product.updated` | `product-embed.ts`   | embed `title + description`, upsert vector |
| `product.deleted`                  | `product-delete.ts`  | delete the product's vector             |

So when a store owner adds a product in the admin, it's findable by meaning within
seconds, with zero extra steps. The `seed-products.ts` script also embeds directly
for a deterministic first load.

## Tech stack

- **[Medusa v2](https://medusajs.com)** — commerce backend (products, pricing,
  admin, events) and the module/subscriber/API framework.
- **PostgreSQL + [pgvector](https://github.com/pgvector/pgvector)** — vector
  storage and HNSW cosine nearest-neighbour search.
- **[Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)**
  (`gemini-embedding-001`, 768-dim) — meaning vectors for products and queries.
- **[Next.js](https://nextjs.org)** — the storefront and its server-side search proxy.
- **TypeScript**, **node-postgres (`pg`)**, **Turborepo**.

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for a step-by-step split deploy:

- **Backend → [Railway](https://railway.app)** (always-on Node server)
- **Storefront → [Vercel](https://vercel.com)** (CDN, free tier)
- **Database → [Neon](https://neon.tech)**, **Redis → [Upstash](https://upstash.com)**

## Limitations & roadmap

This is a focused reference implementation. Known gaps, roughly in priority order:

- The `/semantic-search` route is **unauthenticated and public**. Before real
  traffic, move it under `/store` (publishable API key) or add rate limiting.
- The relevance `threshold` is a single global constant; per-category tuning or a
  relative cutoff would be better.
- No hybrid search yet — combining semantic ranking with keyword/filter (price,
  brand, in-stock) would beat either alone.
- Embeddings are computed one product at a time; batch embedding would speed up
  large catalogs.

## Credits

Built by [Robin](https://github.com/rob0pup). Semantic-search engine,
Medusa module, and storefront are original work; Medusa, pgvector, and Gemini do
the heavy lifting underneath.
