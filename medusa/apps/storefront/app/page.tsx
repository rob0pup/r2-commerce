"use client"

import { useState } from "react"

type Result = { id: string; title: string; description: string; score: number }

const EXAMPLES = [
  "warm layer for a freezing hike",
  "make good coffee at home",
  "quiet focus in a loud office",
  "keep my lunch cold all day",
]

export default function Home() {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Result[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function run(query: string) {
    const term = query.trim()
    if (!term) return
    setQ(term)
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="wrap">
      <div className="brand">R² Commerce</div>
      <h1>Search by meaning, not keywords.</h1>
      <p className="sub">
        Describe what you need in your own words. Powered by Medusa, pgvector, and Gemini
        embeddings.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(q)
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. something for a rainy commute"
          autoFocus
        />
        <button type="submit" disabled={loading || !q.trim()}>
          {loading ? "…" : "Search"}
        </button>
      </form>

      <div className="hints">
        {EXAMPLES.map((ex) => (
          <button type="button" key={ex} className="chip" onClick={() => run(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div className="results">
        {results === null && (
          <p className="empty">Try a phrase above to see products ranked by meaning.</p>
        )}
        {results !== null && results.length === 0 && !loading && (
          <p className="empty">No matches. Try describing it differently.</p>
        )}
        {results?.map((r) => (
          <div className="card" key={r.id}>
            <div>
              <h3>{r.title}</h3>
              <p>{r.description}</p>
            </div>
            <span className="score">{r.score.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <p className="foot">
        Same engine indexes on every product create/update via a Medusa subscriber.
      </p>
    </main>
  )
}
