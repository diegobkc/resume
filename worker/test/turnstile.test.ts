import { describe, it, expect, vi } from 'vitest'
import { verifyTurnstileToken } from '../src/turnstile'

describe('verifyTurnstileToken', () => {
  it('returns true when Cloudflare reports success', async () => {
    const fakeFetch = vi.fn(
      async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    )
    const result = await verifyTurnstileToken(
      'secret',
      'token',
      '1.2.3.4',
      fakeFetch as unknown as typeof fetch,
    )
    expect(result).toBe(true)
  })

  it('returns false when Cloudflare reports failure', async () => {
    const fakeFetch = vi.fn(
      async () => new Response(JSON.stringify({ success: false }), { status: 200 }),
    )
    const result = await verifyTurnstileToken(
      'secret',
      'token',
      '1.2.3.4',
      fakeFetch as unknown as typeof fetch,
    )
    expect(result).toBe(false)
  })

  it('sends the secret, response token, and remote ip in the request body', async () => {
    let capturedBody: URLSearchParams | undefined
    const fakeFetch = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = init?.body as URLSearchParams
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    })
    await verifyTurnstileToken(
      'my-secret',
      'my-token',
      '9.9.9.9',
      fakeFetch as unknown as typeof fetch,
    )
    expect(capturedBody?.get('secret')).toBe('my-secret')
    expect(capturedBody?.get('response')).toBe('my-token')
    expect(capturedBody?.get('remoteip')).toBe('9.9.9.9')
  })
})
