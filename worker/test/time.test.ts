import { describe, it, expect } from 'vitest'
import { secondsUntilUtcMidnight } from '../src/time'

describe('secondsUntilUtcMidnight', () => {
  it('computes seconds remaining until the next UTC midnight', () => {
    const now = new Date('2026-09-20T23:00:00Z')
    expect(secondsUntilUtcMidnight(now)).toBe(3600)
  })

  it('handles a time right at the start of the day', () => {
    const now = new Date('2026-09-20T00:00:00Z')
    expect(secondsUntilUtcMidnight(now)).toBe(24 * 60 * 60)
  })
})
