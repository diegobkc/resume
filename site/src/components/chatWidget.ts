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

export function createChatWidget(): HTMLElement {
  const root = el('div', 'chat-widget')

  const toggleBar = el('button', 'chat-toggle-bar')
  toggleBar.type = 'button'
  toggleBar.textContent = 'Ask me anything about Brian’s work ↑'
  toggleBar.setAttribute('aria-expanded', 'false')
  toggleBar.addEventListener('click', () => {
    const isExpanded = root.classList.toggle('chat-widget-expanded')
    toggleBar.setAttribute('aria-expanded', String(isExpanded))
  })

  const messages = el('div', 'chat-messages')
  const gate = el('div', 'chat-gate')
  gate.hidden = true

  const chips = el('div', 'chat-chips')
  const form = el('form', 'chat-form')
  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Ask me anything about Brian’s work…'
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

    void (async () => {
      try {
        await ensureVerified()
        for await (const chunk of streamChatReply(text)) {
          assistantBubble.textContent += chunk
          messages.scrollTop = messages.scrollHeight
        }
      } catch (err) {
        assistantBubble.textContent =
          err instanceof Error && err.message
            ? err.message
            : 'Something went wrong — try again in a moment.'
      }
    })()
  })

  root.append(toggleBar, messages, chips, gate, form)
  return root
}
