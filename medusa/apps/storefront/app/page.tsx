"use client"

import { useState } from "react"

import { LogoMark } from "./logo-mark"

type Result = {
  id: string
  title: string
  description: string
  price: number | null
  score: number
}

const EXAMPLES = [
  "warm layer for a freezing hike",
  "make good coffee at home",
  "quiet focus in a loud office",
  "keep my lunch cold all day",
]

export default function Home() {
  const [q, setQ] = useState("")
  const [submitted, setSubmitted] = useState("")
  const [results, setResults] = useState<Result[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function run(query: string) {
    const term = query.trim()
    if (!term) return
    setQ(term)
    setSubmitted(term)
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
      <div className="brand">
        <LogoMark className="logo" />
        <span>R² Commerce</span>
      </div>
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
        {loading && (
          <>
            {[0, 1, 2].map((i) => (
              <div className="card skeleton" key={i}>
                <div>
                  <div className="bar bar-title" />
                  <div className="bar bar-text" />
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && results === null && (
          <p className="empty">Try a phrase above to see products ranked by meaning.</p>
        )}

        {!loading && results !== null && (
          <p className="count">
            {results.length === 0
              ? `No strong matches for "${submitted}". Try describing it differently.`
              : `${results.length} ${results.length === 1 ? "match" : "matches"} for "${submitted}"`}
          </p>
        )}

        {!loading &&
          results?.map((r) => (
            <div className="card" key={r.id}>
              <div>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
              </div>
              <div className="meta">
                {r.price !== null && <span className="price">${r.price}</span>}
                <span className="match">{Math.round(r.score * 100)}% match</span>
              </div>
            </div>
          ))}
      </div>

      <p className="foot">
        Same engine indexes on every product create, update, and delete via Medusa subscribers.
      </p>
    </main>
  )
}
