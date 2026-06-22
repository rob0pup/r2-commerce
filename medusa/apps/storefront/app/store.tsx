"use client"

import { useState } from "react"

import type { Product } from "@/lib/medusa"

import { LogoMark } from "./logo-mark"
import { ProductCard } from "./product-card"

type SearchResult = Product & { description?: string; score: number }

const EXAMPLES = [
  "warm layer for a freezing hike",
  "make good coffee at home",
  "quiet focus in a loud office",
  "keep my lunch cold all day",
]

export function Store({ products }: { products: Product[] }) {
  const [q, setQ] = useState("")
  const [submitted, setSubmitted] = useState("")
  const [results, setResults] = useState<SearchResult[] | null>(null)
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

  function clear() {
    setResults(null)
    setSubmitted("")
    setQ("")
  }

  const grid = results ?? products

  return (
    <main className="wrap">
      <div className="brand">
        <LogoMark className="logo" />
        <span>R² Commerce</span>
      </div>
      <h1>Search by meaning, not keywords.</h1>
      <p className="sub">
        A real Medusa store. Describe what you need in your own words and the catalog
        ranks itself by meaning — powered by pgvector and Gemini embeddings.
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

      {results !== null && !loading && (
        <p className="count">
          {results.length === 0
            ? `No strong matches for "${submitted}". `
            : `${results.length} ${results.length === 1 ? "match" : "matches"} for "${submitted}". `}
          <button type="button" className="linklike" onClick={clear}>
            Show all {products.length} products
          </button>
        </p>
      )}

      <div className="grid">
        {loading
          ? [0, 1, 2, 3].map((i) => <div key={i} className="product product-skeleton" />)
          : grid.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                score={"score" in p ? (p as SearchResult).score : undefined}
              />
            ))}
      </div>

      <p className="foot">
        Catalog, pricing, and inventory served live from Medusa. Search ranks products by
        meaning; every product also re-indexes itself when it changes.
      </p>
    </main>
  )
}
