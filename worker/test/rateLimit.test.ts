import { describe, it, expect } from 'vitest'
import { checkAndIncrementRateLimit } from '../src/rateLimit'
import type { KVLike } from '../src/kv'

class FakeKV implements KVLike {
  private store = new Map<string, string>()
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }
}

describe('checkAndIncrementRateLimit', () => {
  it('allows the first message from a new IP', async () => {
    const kv = new FakeKV()
    const result = await checkAndIncrementRateLimit(
      kv,
      '1.2.3.4',
      new Date('2026-09-20T12:00:00Z'),
      15,
    )
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(14)
  })

  it('blocks once the daily limit is reached', async () => {
    const kv = new FakeKV()
    const now = new Date('2026-09-20T12:00:00Z')
    for (let i = 0; i < 3; i++) {
      await checkAndIncrementRateLimit(kv, '1.2.3.4', now, 3)
    }
    const result = await checkAndIncrementRateLimit(kv, '1.2.3.4', now, 3)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks separate IPs independently', async () => {
    const kv = new FakeKV()
    const now = new Date('2026-09-20T12:00:00Z')
    await checkAndIncrementRateLimit(kv, '1.1.1.1', now, 1)
    const result = await checkAndIncrementRateLimit(kv, '2.2.2.2', now, 1)
    expect(result.allowed).toBe(true)
  })
})
