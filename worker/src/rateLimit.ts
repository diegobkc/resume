import type { KVLike } from './kv'
import { secondsUntilUtcMidnight } from './time'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

const DEFAULT_DAILY_MESSAGE_LIMIT = 15

export async function checkAndIncrementRateLimit(
  kv: KVLike,
  ip: string,
  now: Date = new Date(),
  limit: number = DEFAULT_DAILY_MESSAGE_LIMIT,
): Promise<RateLimitResult> {
  const dateKey = now.toISOString().slice(0, 10)
  const key = `rl:${dateKey}:${ip}`
  const raw = await kv.get(key)
  const count = raw ? parseInt(raw, 10) : 0

  if (count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  const nextCount = count + 1
  await kv.put(key, String(nextCount), {
    expirationTtl: secondsUntilUtcMidnight(now),
  })
  return { allowed: true, remaining: limit - nextCount }
}
