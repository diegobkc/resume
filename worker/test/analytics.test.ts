import { describe, it, expect } from 'vitest'
import { recordEvent, getStats, TRACKABLE_EVENTS } from '../src/analytics'
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

describe('recordEvent', () => {
  it('starts a new event counter at 1', async () => {
    const kv = new FakeKV()
    await recordEvent(kv, 'page_view', new Date('2026-09-20T12:00:00Z'))
    const stats = await getStats(kv, ['page_view'], 1, new Date('2026-09-20T12:00:00Z'))
    expect(stats.page_view.total).toBe(1)
  })

  it('increments an existing counter for the same day', async () => {
    const kv = new FakeKV()
    const now = new Date('2026-09-20T12:00:00Z')
    await recordEvent(kv, 'page_view', now)
    await recordEvent(kv, 'page_view', now)
    await recordEvent(kv, 'page_view', now)
    const stats = await getStats(kv, ['page_view'], 1, now)
    expect(stats.page_view.total).toBe(3)
  })

  it('tracks separate event types independently', async () => {
    const kv = new FakeKV()
    const now = new Date('2026-09-20T12:00:00Z')
    await recordEvent(kv, 'page_view', now)
    await recordEvent(kv, 'chat_message', now)
    await recordEvent(kv, 'chat_message', now)
    const stats = await getStats(kv, ['page_view', 'chat_message'], 1, now)
    expect(stats.page_view.total).toBe(1)
    expect(stats.chat_message.total).toBe(2)
  })

  it('keeps separate days as separate counters', async () => {
    const kv = new FakeKV()
    await recordEvent(kv, 'page_view', new Date('2026-09-19T12:00:00Z'))
    await recordEvent(kv, 'page_view', new Date('2026-09-20T12:00:00Z'))
    await recordEvent(kv, 'page_view', new Date('2026-09-20T18:00:00Z'))
    const stats = await getStats(kv, ['page_view'], 2, new Date('2026-09-20T23:00:00Z'))
    expect(stats.page_view.daily['2026-09-19']).toBe(1)
    expect(stats.page_view.daily['2026-09-20']).toBe(2)
    expect(stats.page_view.total).toBe(3)
  })
})

describe('getStats', () => {
  it('reports zero for days with no recorded events', async () => {
    const kv = new FakeKV()
    const stats = await getStats(kv, ['page_view'], 3, new Date('2026-09-20T12:00:00Z'))
    expect(stats.page_view.total).toBe(0)
    expect(stats.page_view.daily['2026-09-18']).toBe(0)
    expect(stats.page_view.daily['2026-09-19']).toBe(0)
    expect(stats.page_view.daily['2026-09-20']).toBe(0)
  })

  it('only reports the requested window of days', async () => {
    const kv = new FakeKV()
    await recordEvent(kv, 'page_view', new Date('2026-09-01T12:00:00Z'))
    const stats = await getStats(kv, ['page_view'], 2, new Date('2026-09-20T12:00:00Z'))
    expect(stats.page_view.total).toBe(0)
    expect(Object.keys(stats.page_view.daily)).toHaveLength(2)
  })
})

describe('TRACKABLE_EVENTS', () => {
  it('is a fixed allowlist including the core signals', () => {
    expect(TRACKABLE_EVENTS).toContain('page_view')
    expect(TRACKABLE_EVENTS).toContain('page_view_classic')
    expect(TRACKABLE_EVENTS).toContain('chat_message')
    expect(TRACKABLE_EVENTS).toContain('card_link_copied')
  })
})
