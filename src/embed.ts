// Gemini embeddings (gemini-embedding-001, 768-dim). Task types matter: index
// documents with RETRIEVAL_DOCUMENT, embed the user query with RETRIEVAL_QUERY.
const MODEL = "gemini-embedding-001"
export const DIM = 768

export async function embed(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[]> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set")

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: DIM,
        taskType,
      }),
    }
  )
  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as { embedding?: { values?: number[] } }
  const values = json.embedding?.values
  if (!values) throw new Error("No embedding returned")
  return values
}

// pgvector accepts a vector as the text literal "[0.1,0.2,...]".
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`
}
