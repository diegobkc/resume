import type { KVLike } from './kv'

// Aggregate daily counters only — no IPs, no cookies, no per-visitor
// identifiers. This deliberately can't answer "who visited" or "what did
// one person do," only "how many of X happened on day Y."
export const TRACKABLE_EVENTS = [
  'page_view',
  'page_view_classic',
  'chat_message',
  'card_link_copied',
] as const

export type TrackableEvent = (typeof TRACKABLE_EVENTS)[number]

export function isTrackableEvent(value: string): value is TrackableEvent {
  return (TRACKABLE_EVENTS as readonly string[]).includes(value)
}

// Kept well past any meaningful "last N days" query window, but not
// forever — old daily counters aren't useful once the trend has long
// since been seen.
const STATS_TTL_SECONDS = 90 * 24 * 60 * 60

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function statsKey(event: TrackableEvent, date: Date): string {
  return `stats:${event}:${dateKey(date)}`
}

export async function recordEvent(
  kv: KVLike,
  event: TrackableEvent,
  now: Date = new Date(),
): Promise<void> {
  const key = statsKey(event, now)
  const raw = await kv.get(key)
  const count = raw ? parseInt(raw, 10) : 0
  await kv.put(key, String(count + 1), { expirationTtl: STATS_TTL_SECONDS })
}

export interface EventStats {
  total: number
  daily: Record<string, number>
}

export async function getStats(
  kv: KVLike,
  events: TrackableEvent[],
  days: number,
  now: Date = new Date(),
): Promise<Record<string, EventStats>> {
  const result: Record<string, EventStats> = {}

  for (const event of events) {
    const daily: Record<string, number> = {}
    let total = 0

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const day = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)
      const key = statsKey(event, day)
      const raw = await kv.get(key)
      const count = raw ? parseInt(raw, 10) : 0
      daily[dateKey(day)] = count
      total += count
    }

    result[event] = { total, daily }
  }

  return result
}
