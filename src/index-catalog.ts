import { config } from "dotenv"

import { CATALOG } from "./catalog.js"
import { getPool, ensureSchema } from "./db.js"
import { embed, toVectorLiteral } from "./embed.js"

// Load .env.local (Next-style) first, then .env as a fallback.
config({ path: ".env.local" })
config()

// Embed every product once and upsert it into pgvector.
async function main() {
  await ensureSchema()
  const db = getPool()

  console.log(`Indexing ${CATALOG.length} products…`)
  for (const p of CATALOG) {
    const vector = await embed(`${p.name}. ${p.description}`, "RETRIEVAL_DOCUMENT")
    await db.query(
      `INSERT INTO products (id, name, description, price, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             price = EXCLUDED.price,
             embedding = EXCLUDED.embedding`,
      [p.id, p.name, p.description, p.price, toVectorLiteral(vector)]
    )
    // Gentle pacing to stay within free-tier embedding limits.
    await new Promise((r) => setTimeout(r, 200))
    process.stdout.write(".")
  }
  console.log(`\nDone. ${CATALOG.length} products indexed.`)
  await db.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
