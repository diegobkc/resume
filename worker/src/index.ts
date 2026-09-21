// worker/src/index.ts
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementRateLimit } from './rateLimit'
import { isBudgetExceeded, recordSpend, estimateCostUsd } from './budget'
import { verifyTurnstileToken } from './turnstile'
import { issueSessionToken, verifySessionToken } from './sessionToken'
import { buildSystemPrompt } from './systemPrompt'
import { recordEvent, getStats, isTrackableEvent, TRACKABLE_EVENTS } from './analytics'

export interface Env {
  RESUME_KV: KVNamespace
  ANTHROPIC_API_KEY: string
  TURNSTILE_SECRET_KEY: string
  SESSION_TOKEN_SECRET: string
  ALLOWED_ORIGINS: string
  STATS_SECRET: string
}

const MAX_MESSAGE_CHARS = 500
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000

function resolveAllowedOrigin(env: Env, requestOrigin: string | null): string {
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((entry) => entry.trim())
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin
  }
  return allowedOrigins[0]
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  }
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

const DEFAULT_STATS_DAYS = 30
const MAX_STATS_DAYS = 90

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = resolveAllowedOrigin(env, request.headers.get('Origin'))

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) })
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok' }, 200, origin)
    }

    if (url.pathname === '/api/verify' && request.method === 'POST') {
      const { turnstileToken } = (await request.json()) as { turnstileToken?: string }
      if (!turnstileToken) {
        return jsonResponse({ error: 'missing turnstileToken' }, 400, origin)
      }
      const remoteIp = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'
      const verified = await verifyTurnstileToken(
        env.TURNSTILE_SECRET_KEY,
        turnstileToken,
        remoteIp,
      )
      if (!verified) {
        return jsonResponse({ error: 'turnstile verification failed' }, 403, origin)
      }
      const sessionToken = await issueSessionToken(env.SESSION_TOKEN_SECRET, Date.now())
      return jsonResponse({ sessionToken }, 200, origin)
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization') ?? ''
      const sessionToken = authHeader.replace(/^Bearer\s+/i, '')
      const sessionValid = await verifySessionToken(
        env.SESSION_TOKEN_SECRET,
        sessionToken,
        Date.now(),
        SESSION_MAX_AGE_MS,
      )
      if (!sessionValid) {
        return jsonResponse({ error: 'session expired, verify again' }, 401, origin)
      }

      const { message } = (await request.json()) as { message?: string }
      if (!message || message.length === 0) {
        return jsonResponse({ error: 'message is required' }, 400, origin)
      }
      if (message.length > MAX_MESSAGE_CHARS) {
        return jsonResponse(
          { error: `message must be ${MAX_MESSAGE_CHARS} characters or fewer` },
          400,
          origin,
        )
      }

      const remoteIp = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'

      if (await isBudgetExceeded(env.RESUME_KV)) {
        return jsonResponse(
          {
            error:
              'The concierge is resting for today — see the traditional resume or email Brian directly.',
          },
          503,
          origin,
        )
      }

      const rateLimit = await checkAndIncrementRateLimit(env.RESUME_KV, remoteIp)
      if (!rateLimit.allowed) {
        return jsonResponse(
          { error: "You've reached today's question limit for the concierge — try again tomorrow." },
          429,
          origin,
        )
      }

      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
      const encoder = new TextEncoder()

      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const stream = client.messages.stream({
            model: 'claude-haiku-4-5',
            max_tokens: 300,
            system: buildSystemPrompt(),
            messages: [{ role: 'user', content: message }],
          })

          stream.on('text', (textDelta: string) => {
            controller.enqueue(encoder.encode(textDelta))
          })

          try {
            const finalMessage = await stream.finalMessage()
            const cost = estimateCostUsd(
              finalMessage.usage.input_tokens,
              finalMessage.usage.output_tokens,
            )
            await recordSpend(env.RESUME_KV, cost)
          } catch (err) {
            controller.enqueue(
              encoder.encode(
                '\n\n[The concierge hit an error — please try again, or see the traditional resume.]',
              ),
            )
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: { 'content-type': 'text/plain; charset=utf-8', ...corsHeaders(origin) },
      })
    }

    if (url.pathname === '/api/track' && request.method === 'POST') {
      const { event } = (await request.json().catch(() => ({}))) as { event?: string }
      if (!event || !isTrackableEvent(event)) {
        return jsonResponse({ error: 'unknown event' }, 400, origin)
      }
      await recordEvent(env.RESUME_KV, event)
      return jsonResponse({ ok: true }, 200, origin)
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const secret = url.searchParams.get('secret') ?? ''
      if (!env.STATS_SECRET || !timingSafeEqual(secret, env.STATS_SECRET)) {
        return jsonResponse({ error: 'unauthorized' }, 401, origin)
      }
      const requestedDays = Number(url.searchParams.get('days'))
      const days = Number.isFinite(requestedDays) && requestedDays > 0
        ? Math.min(requestedDays, MAX_STATS_DAYS)
        : DEFAULT_STATS_DAYS
      const stats = await getStats(env.RESUME_KV, [...TRACKABLE_EVENTS], days)
      return jsonResponse({ days, stats }, 200, origin)
    }

    return jsonResponse({ error: 'not found' }, 404, origin)
  },
}
