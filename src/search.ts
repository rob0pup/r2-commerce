import { config } from "dotenv"

import { getPool } from "./db.js"
import { embed, toVectorLiteral } from "./embed.js"

// Load .env.local (Next-style) first, then .env as a fallback.
config({ path: ".env.local" })
config()

type Match = { name: string; description: string; price: string; score: number }

// Semantic search: embed the query, then rank products by cosine similarity.
async function search(query: string, topK = 5): Promise<Match[]> {
  const qVector = await embed(query, "RETRIEVAL_QUERY")
  const db = getPool()
  const { rows } = await db.query(
    `SELECT name, description, price,
            1 - (embedding <=> $1::vector) AS score
     FROM products
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [toVectorLiteral(qVector), topK]
  )
  return rows as Match[]
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim()
  if (!query) {
    console.error('Usage: pnpm search "something for a rainy commute"')
    process.exit(1)
  }
  console.log(`\nQuery: "${query}"\n`)
  const matches = await search(query)
  matches.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name}  ($${m.price})  ${m.score.toFixed(3)}`)
    console.log(`   ${m.description}`)
  })
  await getPool().end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
