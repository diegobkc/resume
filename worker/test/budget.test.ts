import { describe, it, expect } from 'vitest'
import {
  estimateCostUsd,
  getDailySpend,
  recordSpend,
  isBudgetExceeded,
} from '../src/budget'
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

describe('estimateCostUsd', () => {
  it('estimates cost from Haiku per-token pricing', () => {
    // 1000 input tokens + 1000 output tokens, at $0.25/$1.25 per million tokens
    const cost = estimateCostUsd(1000, 1000)
    expect(cost).toBeCloseTo(0.0015, 6)
  })
})

describe('getDailySpend / recordSpend', () => {
  it('starts at zero for a day with no recorded spend', async () => {
    const kv = new FakeKV()
    const spend = await getDailySpend(kv, new Date('2026-09-20T12:00:00Z'))
    expect(spend).toBe(0)
  })

  it('accumulates spend across multiple calls on the same day', async () => {
    const kv = new FakeKV()
    const now = new Date('2026-09-20T12:00:00Z')
    await recordSpend(kv, 0.01, now)
    const total = await recordSpend(kv, 0.02, now)
    expect(total).toBeCloseTo(0.03, 6)
  })
})

describe('isBudgetExceeded', () => {
  it('is false when spend is under the cap', async () => {
    const kv = new FakeKV()
    const now = new Date('2026-09-20T12:00:00Z')
    await recordSpend(kv, 1.0, now)
    expect(await isBudgetExceeded(kv, now, 2.0)).toBe(false)
  })

  it('is true once spend meets or exceeds the cap', async () => {
    const kv = new FakeKV()
    const now = new Date('2026-09-20T12:00:00Z')
    await recordSpend(kv, 2.0, now)
    expect(await isBudgetExceeded(kv, now, 2.0)).toBe(true)
  })
})
