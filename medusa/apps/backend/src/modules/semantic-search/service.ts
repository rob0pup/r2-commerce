import { Pool } from "pg"

import { DIM, embed, toVectorLiteral } from "./embed"

export type SearchHit = { productId: string; score: number }

/**
 * Semantic search over products, backed by pgvector. The Medusa data-model
 * layer has no `vector` type, so this module owns a small `product_embedding`
 * table and talks to it with raw SQL through its own pooled connection.
 */
export default class SemanticSearchService {
  protected pool_: Pool
  protected schemaReady_: Promise<void> | null = null

  constructor() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error("DATABASE_URL is not set")
    this.pool_ = new Pool({ connectionString })
  }

  // Enable pgvector and create the embedding table + HNSW index (idempotent).
  protected ensureSchema(): Promise<void> {
    if (!this.schemaReady_) {
      this.schemaReady_ = (async () => {
        await this.pool_.query("CREATE EXTENSION IF NOT EXISTS vector")
        await this.pool_.query(`
          CREATE TABLE IF NOT EXISTS product_embedding (
            product_id TEXT PRIMARY KEY,
            content    TEXT NOT NULL,
            embedding  vector(${DIM})
          )
        `)
        await this.pool_.query(
          "CREATE INDEX IF NOT EXISTS product_embedding_idx ON product_embedding USING hnsw (embedding vector_cosine_ops)"
        )
      })()
    }
    return this.schemaReady_
  }

  // Embed a product's text and upsert its vector.
  async upsertProduct(productId: string, content: string): Promise<void> {
    await this.ensureSchema()
    const vector = await embed(content, "RETRIEVAL_DOCUMENT")
    await this.pool_.query(
      `INSERT INTO product_embedding (product_id, content, embedding)
       VALUES ($1, $2, $3::vector)
       ON CONFLICT (product_id) DO UPDATE
         SET content = EXCLUDED.content, embedding = EXCLUDED.embedding`,
      [productId, content, toVectorLiteral(vector)]
    )
  }

  async removeProduct(productId: string): Promise<void> {
    await this.ensureSchema()
    await this.pool_.query("DELETE FROM product_embedding WHERE product_id = $1", [productId])
  }

  // Rank products by cosine similarity to the query.
  async search(query: string, limit = 10): Promise<SearchHit[]> {
    await this.ensureSchema()
    const qVector = await embed(query, "RETRIEVAL_QUERY")
    const { rows } = await this.pool_.query(
      `SELECT product_id, 1 - (embedding <=> $1::vector) AS score
       FROM product_embedding
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [toVectorLiteral(qVector), limit]
    )
    return rows.map((r: { product_id: string; score: string }) => ({
      productId: r.product_id,
      score: Number(r.score),
    }))
  }
}
