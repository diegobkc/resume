// site/src/lib/analytics.ts
const WORKER_BASE_URL = 'https://resume-concierge.brian-joneskc01.workers.dev'

export type TrackableEvent = 'page_view' | 'page_view_classic' | 'chat_message' | 'card_link_copied'

// Fire-and-forget: analytics must never block or break the page. Failures
// (offline, blocked by an extension, Worker hiccup) are silently swallowed.
export function track(event: TrackableEvent): void {
  fetch(`${WORKER_BASE_URL}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {
    // Best effort — analytics gaps are acceptable, broken UX is not.
  })
}
