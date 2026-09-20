// site/src/lib/chatClient.ts
const WORKER_BASE_URL = 'https://resume-concierge.brian-joneskc01.workers.dev'

let sessionToken: string | null = null

export function hasSession(): boolean {
  return sessionToken !== null
}

export async function verifySession(turnstileToken: string): Promise<void> {
  const res = await fetch(`${WORKER_BASE_URL}/api/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnstileToken }),
  })
  if (!res.ok) {
    throw new Error('Verification failed — please try again.')
  }
  const data = (await res.json()) as { sessionToken: string }
  sessionToken = data.sessionToken
}

export async function* streamChatReply(message: string): AsyncGenerator<string> {
  if (!sessionToken) {
    throw new Error('Not verified yet.')
  }

  const res = await fetch(`${WORKER_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ message }),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({ error: undefined }))) as {
      error?: string
    }
    if (res.status === 401) {
      sessionToken = null
    }
    throw new Error(data.error ?? 'Something went wrong — please try again.')
  }

  const reader = res.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
  const remaining = decoder.decode()
  if (remaining) {
    yield remaining
  }
}
