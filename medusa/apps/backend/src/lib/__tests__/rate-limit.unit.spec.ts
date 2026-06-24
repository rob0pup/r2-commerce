import { createRateLimiter } from "../rate-limit"

describe("createRateLimiter", () => {
  it("allows up to max requests, then blocks", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 3, now: () => 1000 })
    expect(rl.check("ip").allowed).toBe(true)
    expect(rl.check("ip").allowed).toBe(true)
    expect(rl.check("ip").allowed).toBe(true)
    const blocked = rl.check("ip")
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it("resets once the window passes", () => {
    let t = 0
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: () => t })
    expect(rl.check("ip").allowed).toBe(true)
    expect(rl.check("ip").allowed).toBe(false)
    t = 1000
    expect(rl.check("ip").allowed).toBe(true)
  })

  it("tracks keys independently", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 })
    expect(rl.check("a").allowed).toBe(true)
    expect(rl.check("b").allowed).toBe(true)
    expect(rl.check("a").allowed).toBe(false)
  })
})
