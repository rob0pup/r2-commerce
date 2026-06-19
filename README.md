# r2-commerce

Semantic product search for commerce, built on **pgvector + Gemini embeddings**.
This is the core engine of an AI search layer for Medusa stores: it ranks
products by *meaning*, not keywords. The Medusa module wraps this engine next.

## How it works

1. Each product's `name + description` is embedded with Gemini
   (`gemini-embedding-001`, 768-dim) and stored in Postgres as a `vector`.
2. A search embeds the query and ranks products by cosine similarity
   (`embedding <=> query`), so "something for a rainy commute" finds the
   waterproof backpack even without those words.

## Setup

1. Create a free **Neon** Postgres project (neon.tech) and copy the pooled
   connection string.
2. Copy env and fill it in:
   ```bash
   cp .env.example .env
   # set DATABASE_URL (Neon) and GOOGLE_GENERATIVE_AI_API_KEY (Google AI Studio)
   ```
3. Install, index the demo catalog, then search:
   ```bash
   pnpm install
   pnpm index
   pnpm search "something for a rainy commute"
   pnpm search "make good coffee at home"
   pnpm search "quiet focus in a loud office"
   ```

## Next

- Wrap this as a Medusa v2 module (index on product create/update via
  subscribers; expose a `/store/semantic-search` route).
- Demo storefront + deploy (Medusa on Railway, storefront on Vercel).
