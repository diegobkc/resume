import { describe, it, expect } from 'vitest'
import { issueSessionToken, verifySessionToken } from '../src/sessionToken'

describe('session tokens', () => {
  it('a freshly issued token verifies successfully', async () => {
    const now = Date.parse('2026-09-20T12:00:00Z')
    const token = await issueSessionToken('test-secret', now)
    expect(await verifySessionToken('test-secret', token, now + 1000)).toBe(true)
  })

  it('rejects a token signed with a different secret', async () => {
    const now = Date.parse('2026-09-20T12:00:00Z')
    const token = await issueSessionToken('secret-a', now)
    expect(await verifySessionToken('secret-b', token, now + 1000)).toBe(false)
  })

  it('rejects a token older than the max age', async () => {
    const now = Date.parse('2026-09-20T12:00:00Z')
    const token = await issueSessionToken('test-secret', now)
    const threeHoursLater = now + 3 * 60 * 60 * 1000
    expect(
      await verifySessionToken('test-secret', token, threeHoursLater, 2 * 60 * 60 * 1000),
    ).toBe(false)
  })

  it('rejects a malformed token', async () => {
    expect(await verifySessionToken('test-secret', 'not-a-real-token', Date.now())).toBe(false)
  })
})
