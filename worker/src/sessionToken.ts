async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function issueSessionToken(secret: string, issuedAtMs: number): Promise<string> {
  const signature = await hmacHex(secret, String(issuedAtMs))
  return `${issuedAtMs}.${signature}`
}

const DEFAULT_MAX_AGE_MS = 2 * 60 * 60 * 1000

export async function verifySessionToken(
  secret: string,
  token: string,
  nowMs: number,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): Promise<boolean> {
  const [issuedAtStr, signature] = token.split('.')
  if (!issuedAtStr || !signature) return false

  const issuedAtMs = Number(issuedAtStr)
  if (!Number.isFinite(issuedAtMs)) return false
  if (nowMs - issuedAtMs > maxAgeMs) return false
  if (nowMs < issuedAtMs) return false

  const expectedSignature = await hmacHex(secret, issuedAtStr)
  return expectedSignature === signature
}
