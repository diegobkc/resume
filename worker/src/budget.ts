import type { KVLike } from './kv'
import { secondsUntilUtcMidnight } from './time'

// Pricing constants are Claude Haiku's per-token rate at time of writing —
// verify against current published Anthropic pricing before relying on this
// for real budget enforcement, and update the constants if pricing has
// changed.
const DEFAULT_DAILY_BUDGET_USD = 2.0
const INPUT_COST_PER_TOKEN = 0.25 / 1_000_000
const OUTPUT_COST_PER_TOKEN = 1.25 / 1_000_000

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN
}

export async function getDailySpend(kv: KVLike, now: Date = new Date()): Promise<number> {
  const key = `spend:${now.toISOString().slice(0, 10)}`
  const raw = await kv.get(key)
  return raw ? parseFloat(raw) : 0
}

export async function recordSpend(
  kv: KVLike,
  amountUsd: number,
  now: Date = new Date(),
): Promise<number> {
  const key = `spend:${now.toISOString().slice(0, 10)}`
  const current = await getDailySpend(kv, now)
  const next = current + amountUsd
  await kv.put(key, String(next), { expirationTtl: secondsUntilUtcMidnight(now) })
  return next
}

export async function isBudgetExceeded(
  kv: KVLike,
  now: Date = new Date(),
  cap: number = DEFAULT_DAILY_BUDGET_USD,
): Promise<boolean> {
  const spend = await getDailySpend(kv, now)
  return spend >= cap
}
