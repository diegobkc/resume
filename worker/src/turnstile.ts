export async function verifyTurnstileToken(
  secret: string,
  token: string,
  remoteIp: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  body.set('remoteip', remoteIp)

  const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })
  const data = (await res.json()) as { success: boolean }
  return data.success === true
}
