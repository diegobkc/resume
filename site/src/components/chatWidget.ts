// site/src/components/chatWidget.ts
import { hasSession, verifySession, streamChatReply } from '../lib/chatClient'

const TURNSTILE_SITE_KEY = '0x4AAAAAAEiUFZkjq8Okehej'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void },
      ) => string
    }
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function waitForTurnstile(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }
    let attempts = 0
    const maxAttempts = 50 // ~5 seconds at 100ms intervals
    const check = window.setInterval(() => {
      if (window.turnstile) {
        window.clearInterval(check)
        resolve()
        return
      }
      attempts += 1
      if (attempts >= maxAttempts) {
        window.clearInterval(check)
        reject(new Error('Verification failed to load — please refresh and try again.'))
      }
    }, 100)
  })
}

const SUGGESTIONS = [
  'What’s the AMIS trading system?',
  'Tell me about the DH Pace team',
  'What’s Quack Fortress?',
]

const NUDGE_STORAGE_KEY = 'resume-chat-nudge-seen'
const NUDGE_DELAY_MS = 1600
const NUDGE_DURATION_MS = 2400

// On mobile the concierge starts collapsed behind a thin toggle bar, which
// first-time visitors easily miss entirely. This plays a brief, one-time
// attention pulse on the toggle bar shortly after load — never again once
// shown (tracked in localStorage), and skipped if the visitor has already
// opened the widget by the time it would fire.
function scheduleFirstVisitNudge(
  root: HTMLElement,
  toggleBar: HTMLElement,
  mobileLayoutQuery: MediaQueryList,
): void {
  if (!mobileLayoutQuery.matches) return

  let alreadySeen = true
  try {
    alreadySeen = window.localStorage.getItem(NUDGE_STORAGE_KEY) === '1'
  } catch {
    return
  }
  if (alreadySeen) return

  window.setTimeout(() => {
    if (root.classList.contains('chat-widget-expanded')) return
    toggleBar.classList.add('chat-toggle-bar-nudge')
    window.setTimeout(() => {
      toggleBar.classList.remove('chat-toggle-bar-nudge')
    }, NUDGE_DURATION_MS)
    try {
      window.localStorage.setItem(NUDGE_STORAGE_KEY, '1')
    } catch {
      // Best effort — worst case the nudge plays again on a future visit.
    }
  }, NUDGE_DELAY_MS)
}

export function createChatWidget(): HTMLElement {
  const root = el('div', 'chat-widget')

  const toggleBar = el('button', 'chat-toggle-bar')
  toggleBar.type = 'button'
  toggleBar.textContent = 'Ask me anything about Brian’s work ↑'
  toggleBar.setAttribute('aria-expanded', 'false')

  const mobileLayoutQuery = window.matchMedia('(max-width: 860px)')

  const messages = el('div', 'chat-messages')
  const gate = el('div', 'chat-gate')
  gate.hidden = true

  const chips = el('div', 'chat-chips')
  const form = el('form', 'chat-form')

  const contentWrapper = el('div', 'chat-widget-content')
  contentWrapper.append(messages, chips, gate, form)

  function syncAccessibilityState(expanded: boolean): void {
    toggleBar.setAttribute('aria-expanded', String(expanded))
    if (mobileLayoutQuery.matches) {
      // On mobile, the panel is visually off-screen when collapsed —
      // hide it from the accessibility tree too so a screen reader's
      // virtual cursor doesn't land on stale, invisible content. This
      // targets contentWrapper (not root) so toggleBar — the one visible,
      // interactive element when collapsed — is never itself hidden.
      contentWrapper.setAttribute('aria-hidden', String(!expanded))
    } else {
      // On desktop the widget is always fully visible regardless of
      // this class, so it must never be hidden from assistive tech here.
      contentWrapper.removeAttribute('aria-hidden')
    }
  }

  syncAccessibilityState(false)

  toggleBar.addEventListener('click', () => {
    const isExpanded = root.classList.toggle('chat-widget-expanded')
    syncAccessibilityState(isExpanded)
  })

  mobileLayoutQuery.addEventListener('change', () => {
    syncAccessibilityState(root.classList.contains('chat-widget-expanded'))
  })

  scheduleFirstVisitNudge(root, toggleBar, mobileLayoutQuery)

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Ask me anything about Brian’s work…'
  input.setAttribute('aria-label', 'Ask me anything about Brian’s work')
  input.maxLength = 500
  const submit = document.createElement('button')
  submit.type = 'submit'
  submit.textContent = 'Ask'
  form.append(input, submit)

  for (const suggestion of SUGGESTIONS) {
    const chip = el('button', 'chat-chip')
    chip.type = 'button'
    chip.textContent = suggestion
    chip.addEventListener('click', () => {
      input.value = suggestion
      form.requestSubmit()
    })
    chips.appendChild(chip)
  }

  function appendMessage(role: 'user' | 'assistant', text: string): HTMLElement {
    const bubble = el('div', `chat-bubble chat-bubble-${role}`)
    bubble.textContent = text
    messages.appendChild(bubble)
    messages.scrollTop = messages.scrollHeight
    return bubble
  }

  function showThinkingIndicator(bubble: HTMLElement): void {
    bubble.setAttribute('aria-label', 'Thinking')
    const indicator = el('span', 'chat-thinking')
    indicator.append(
      el('span', 'chat-thinking-dot'),
      el('span', 'chat-thinking-dot'),
      el('span', 'chat-thinking-dot'),
    )
    bubble.appendChild(indicator)
  }

  function clearThinkingIndicator(bubble: HTMLElement): void {
    bubble.removeAttribute('aria-label')
    bubble.replaceChildren()
  }

  async function ensureVerified(): Promise<void> {
    if (hasSession()) return

    await waitForTurnstile()

    return new Promise((resolve, reject) => {
      gate.replaceChildren()
      const prompt = el('p')
      prompt.textContent = 'Quick human check before we start:'
      const widgetContainer = el('div')
      gate.append(prompt, widgetContainer)
      gate.hidden = false

      window.turnstile?.render(widgetContainer, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          verifySession(token)
            .then(() => {
              gate.hidden = true
              resolve()
            })
            .catch((err: unknown) => {
              gate.replaceChildren()
              gate.append(el('p', undefined))
              gate.lastElementChild!.textContent =
                'Verification failed — please refresh and try again.'
              reject(err instanceof Error ? err : new Error('verification failed'))
            })
        },
      })
    })
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    appendMessage('user', text)
    const assistantBubble = appendMessage('assistant', '')
    showThinkingIndicator(assistantBubble)

    void (async () => {
      try {
        await ensureVerified()
        let firstChunk = true
        for await (const chunk of streamChatReply(text)) {
          if (firstChunk) {
            clearThinkingIndicator(assistantBubble)
            firstChunk = false
          }
          assistantBubble.textContent += chunk
          messages.scrollTop = messages.scrollHeight
        }
      } catch (err) {
        clearThinkingIndicator(assistantBubble)
        assistantBubble.textContent =
          err instanceof Error && err.message
            ? err.message
            : 'Something went wrong — try again in a moment.'
      }
    })()
  })

  root.append(toggleBar, contentWrapper)
  return root
}
