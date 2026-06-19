import pg from "pg"

import { DIM } from "./embed.js"

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error("DATABASE_URL is not set")
    pool = new pg.Pool({ connectionString })
  }
  return pool
}

// Enable pgvector and create the products table (idempotent).
export async function ensureSchema(): Promise<void> {
  const db = getPool()
  await db.query("CREATE EXTENSION IF NOT EXISTS vector")
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      price       NUMERIC NOT NULL,
      embedding   vector(${DIM})
    )
  `)
  // Cosine-distance index for fast nearest-neighbour search.
  await db.query(
    "CREATE INDEX IF NOT EXISTS products_embedding_idx ON products USING hnsw (embedding vector_cosine_ops)"
  )
}
