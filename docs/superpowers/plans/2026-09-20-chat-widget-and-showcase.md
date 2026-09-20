# Chat Widget, Project Showcase & Layout Assembly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the concierge chat widget UI (talking to the Worker from Plan `2026-09-20-concierge-worker.md`), the nine project showcase cards, and assemble the full Persistent Split layout with mobile collapse behavior — the last plan before the interactive resume is feature-complete.

**Architecture:** A `chatClient.ts` module owns all network/session-token state and exposes a small async-generator streaming API. A `chatWidget.ts` module builds the chat UI purely with DOM APIs (never `innerHTML`, since it renders model output). `projects.ts` holds the nine cards' content as data; `projectCard.ts` renders them. `layout.css` implements the Persistent Split (sticky left panel on desktop, collapsed-bar-to-overlay on mobile) from spec §5. `main.ts` wires everything together into the page.

**Tech Stack:** Vanilla TypeScript + DOM APIs, Cloudflare Turnstile's hosted widget script, hand-authored SVG icons (chosen over AI-generated card art — see Task 3 rationale).

Refers to spec: `docs/superpowers/specs/2026-09-20-interactive-resume-design.md`, §4.1/§4.4 (concierge UX), §5 (layout), §6 (showcase cards), §9 (accessibility).

Prerequisites:
- Plan `2026-09-20-resume-repo-scaffold.md` complete.
- Plan `2026-09-20-concierge-worker.md` complete and deployed — you need its real `workers.dev` URL and a real Cloudflare Turnstile site key (created in the Cloudflare dashboard, Turnstile → Add site, domain `diegobkc.github.io`) before Task 1.
- Plan `2026-09-20-duck-asset-pipeline.md` complete (or at least its `duck-viewer.ts` component) if you want the duck present when this plan's layout is assembled — otherwise the left panel simply omits it until that plan lands; the two are independent and can be done in either order.

---

### Task 1: Chat client (streaming, session token management)

**Files:**
- Create: `site/src/lib/chatClient.ts`

- [ ] **Step 1: Create the chat client**

Replace `WORKER_BASE_URL` with the real URL from Plan
`2026-09-20-concierge-worker.md` Task 9, Step 4's `wrangler deploy` output.

```typescript
// site/src/lib/chatClient.ts
const WORKER_BASE_URL = 'https://resume-concierge.REPLACE_WITH_ACCOUNT_SUBDOMAIN.workers.dev'

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
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/brianjones/Development/GitHub/resume-site/site
npx tsc -b --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/src/lib/chatClient.ts
git commit -m "Add chat client with session-token management and streaming reads"
```

---

### Task 2: Chat widget UI

**Files:**
- Create: `site/src/components/chatWidget.ts`
- Modify: `site/index.html` (add the Turnstile script tag)

- [ ] **Step 1: Add the Turnstile script to `site/index.html`**

Add this line inside `<head>`, after the existing stylesheet link:

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

- [ ] **Step 2: Create `site/src/components/chatWidget.ts`**

Replace `TURNSTILE_SITE_KEY` with the real site key from the Cloudflare
Turnstile dashboard. Builds everything through `createElement`/`textContent`
— never `innerHTML` — since assistant message bubbles render live model
output.

```typescript
// site/src/components/chatWidget.ts
import { hasSession, verifySession, streamChatReply } from '../lib/chatClient'

const TURNSTILE_SITE_KEY = 'REPLACE_WITH_REAL_TURNSTILE_SITE_KEY'

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
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve()
      return
    }
    const check = window.setInterval(() => {
      if (window.turnstile) {
        window.clearInterval(check)
        resolve()
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
  toggleBar.addEventListener('click', () => {
    root.classList.toggle('chat-widget-expanded')
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
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /Users/brianjones/Development/GitHub/resume-site/site
npx tsc -b --noEmit
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/index.html site/src/components/chatWidget.ts
git commit -m "Add chat widget UI with Turnstile gate and streaming display"
```

---

### Task 3: Project showcase data and nine blueprint-style icons

**Rationale for hand-built SVG over AI-generated card art:** the Systems
Blueprint direction is inherently line-based (grid, annotation labels, thin
strokes) — simple authored SVG line icons match that exactly, render at any
size with zero compression concerns, cost nothing, and don't carry the
"does this one AI generation actually look good" risk that nine more
Higgsfield calls would add on top of the duck. The duck stays the one AI/
Blender-produced asset; the cards stay deterministic and fast.

**Files:**
- Create: `site/src/data/projects.ts`
- Create: `site/public/icons/*.svg` (9 files)

- [ ] **Step 1: Create the nine icon files**

Each is a simple 64×64 line-art icon using the blueprint accent color.

```svg
<!-- site/public/icons/ais-overview.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <circle cx="20" cy="20" r="6"/>
  <circle cx="44" cy="20" r="6"/>
  <circle cx="32" cy="44" r="6"/>
  <path d="M20 26 L32 38 M44 26 L32 38"/>
</svg>
```

```svg
<!-- site/public/icons/sir.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <rect x="10" y="14" width="10" height="10"/>
  <rect x="27" y="14" width="10" height="10"/>
  <rect x="44" y="14" width="10" height="10"/>
  <path d="M20 19 L27 19 M37 19 L44 19"/>
  <path d="M15 24 L15 40 L49 40 L49 24" stroke-dasharray="3 3"/>
</svg>
```

```svg
<!-- site/public/icons/credit-request.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <rect x="12" y="10" width="24" height="30" rx="2"/>
  <path d="M18 18 H30 M18 24 H30 M18 30 H26"/>
  <path d="M36 32 L52 32 M46 26 L52 32 L46 38"/>
</svg>
```

```svg
<!-- site/public/icons/vpp.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <path d="M32 8 L50 16 V30 C50 42 42 50 32 54 C22 50 14 42 14 30 V16 Z"/>
  <path d="M24 30 L30 36 L42 22"/>
</svg>
```

```svg
<!-- site/public/icons/garagelink.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <path d="M12 38 L16 24 H40 L46 32 H52 V38"/>
  <circle cx="22" cy="42" r="5"/>
  <circle cx="42" cy="42" r="5"/>
  <path d="M12 38 H14 M50 38 H52"/>
</svg>
```

```svg
<!-- site/public/icons/dfpp-agency.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <circle cx="32" cy="32" r="8"/>
  <path d="M32 12 V18 M32 46 V52 M12 32 H18 M46 32 H52 M18 18 L22 22 M46 18 L42 22 M18 46 L22 42 M46 46 L42 42"/>
</svg>
```

```svg
<!-- site/public/icons/site-delivery.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <rect x="10" y="14" width="44" height="30" rx="2"/>
  <path d="M10 22 H54"/>
  <circle cx="16" cy="18" r="1.2" fill="#3b6ea5"/>
  <circle cx="21" cy="18" r="1.2" fill="#3b6ea5"/>
  <path d="M18 30 L26 36 L18 42 M34 42 H46"/>
</svg>
```

```svg
<!-- site/public/icons/infra-migration.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <path d="M20 30 a8 8 0 0 1 0-16 a11 11 0 0 1 21-3 a9 9 0 0 1 1 18 H20 a8 8 0 0 1 0 0" />
  <path d="M24 40 L32 48 L40 40 M32 32 V48"/>
</svg>
```

```svg
<!-- site/public/icons/quack-fortress.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#3b6ea5" stroke-width="2">
  <path d="M18 40 C16 30 22 20 34 20 C44 20 50 26 50 32 C50 34 48 35 46 34 L42 32 C40 38 34 42 26 42 C22 42 19 41 18 40 Z"/>
  <circle cx="44" cy="26" r="1.4" fill="#3b6ea5"/>
  <path d="M50 30 L56 28"/>
</svg>
```

- [ ] **Step 2: Create `site/src/data/projects.ts`**

```typescript
// site/src/data/projects.ts
export interface ProjectCard {
  id: string
  group: 'DH Pace — AIS' | 'DFPP LLC' | 'Volunteer'
  icon: string
  hook: string
  facts: string[]
}

export const PROJECTS: ProjectCard[] = [
  {
    id: 'ais-overview',
    group: 'DH Pace — AIS',
    icon: '/resume/icons/ais-overview.svg',
    hook: 'Leading the systems that run on trust.',
    facts: [
      'Directs a team of systems analysts, senior business analysts, a SharePoint administrator, and Oracle APEX developers.',
      'The portfolio automates approval-driven processes: commission review, credit/refund, vendor payments, field payments.',
      'Built AI-assisted development into the team’s standing delivery methodology using Claude Code.',
      'AI generates technical specs, UAT checklists, and executive summaries as part of the real workflow — not a side experiment.',
    ],
  },
  {
    id: 'sir',
    group: 'DH Pace — AIS',
    icon: '/resume/icons/sir.svg',
    hook: 'Eight commission types, one workflow.',
    facts: [
      'Replaced a manual, spreadsheet-driven commission audit process.',
      '4-stage, AD-role-gated approval: a role-gated chain.',
      'Batch toolbar actions let reviewers act on multiple records at once, across eight commission line types.',
      'React/TypeScript, MUI X Data Grid, Oracle APEX ORDS, Entra ID SSO.',
    ],
  },
  {
    id: 'credit-request',
    group: 'DH Pace — AIS',
    icon: '/resume/icons/credit-request.svg',
    hook: 'Two ERPs, one credit and refund platform.',
    facts: [
      'A 3-phase, ~263-story-point initiative unifying two ERP systems' credit/refund handling.',
      'Configurable 5-stage, dollar-threshold approval workflow.',
      'Automatic org-hierarchy-based approver assignment.',
      'SOAP integration with the ERP auto-populates invoice data.',
    ],
  },
  {
    id: 'vpp',
    group: 'DH Pace — AIS',
    icon: '/resume/icons/vpp.svg',
    hook: 'Reverse-engineered an undocumented approval path — then proved it.',
    facts: [
      'Migrated off a legacy Nintex/SharePoint approval process.',
      'A data-driven, location-based approver-matching algorithm replaced hard-coded Nintex logic.',
      '25+ script SQL migration history, Playwright end-to-end test coverage.',
      'Passed a pre-deployment security audit: strong marks across security and code quality, "GO" recommendation.',
    ],
  },
  {
    id: 'garagelink',
    group: 'DFPP LLC',
    icon: '/resume/icons/garagelink.svg',
    hook: 'A SaaS product, owned end to end.',
    facts: [
      'Multi-tenant scheduling and customer-communication platform for independent auto shops.',
      'Three React single-page apps: customer, shop owner, admin.',
      'Accountless customer authentication via 90-day signed links.',
      'Six N8N workflows for reminders, recalls, and idempotent nudge loops.',
    ],
  },
  {
    id: 'dfpp-agency',
    group: 'DFPP LLC',
    icon: '/resume/icons/dfpp-agency.svg',
    hook: 'The client-services side of DFPP.',
    facts: [
      'Brian’s client-services brand and agency under DFPP LLC.',
      'Delivers N8N-based workflow automation for service businesses.',
      'dfppagency.com',
    ],
  },
  {
    id: 'site-delivery',
    group: 'DFPP LLC',
    icon: '/resume/icons/site-delivery.svg',
    hook: '32 skills, 6 agents, one delivery pipeline.',
    facts: [
      'A Claude Code skill/agent pipeline for client site delivery.',
      'Covers prospect intake, performance baselining, mockup building, and production handoff.',
      'Deployed vertical demo sites and improved real client performance and accessibility scores.',
    ],
  },
  {
    id: 'infra-migration',
    group: 'DFPP LLC',
    icon: '/resume/icons/infra-migration.svg',
    hook: 'Five production properties, zero-surprise cutovers.',
    facts: [
      'Migrated five properties from Netlify to Cloudflare Workers.',
      'Black-box baseline test suites required green on both the old site and the new preview before cutover.',
      '48–72 hour rollback windows on every migration.',
    ],
  },
  {
    id: 'quack-fortress',
    group: 'Volunteer',
    icon: '/resume/icons/quack-fortress.svg',
    hook: 'Where this duck came from.',
    facts: [
      'AI-assisted game development mentorship for at-risk youth in Detroit.',
      '264 commits across 11 milestones in about 10 days.',
      '374 automated tests, test-driven development on pure game-logic modules.',
      'Server-authoritative architecture, MCP-driven automated playtesting.',
    ],
  },
]
```

- [ ] **Step 3: Verify it compiles**

```bash
cd /Users/brianjones/Development/GitHub/resume-site/site
npx tsc -b --noEmit
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/public/icons site/src/data/projects.ts
git commit -m "Add project showcase data and blueprint-style icons for nine cards"
```

---

### Task 4: Project card component

**Files:**
- Create: `site/src/components/projectCard.ts`

- [ ] **Step 1: Create the component**

```typescript
// site/src/components/projectCard.ts
import type { ProjectCard } from '../data/projects'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

export function renderProjectCard(project: ProjectCard): HTMLElement {
  const card = el('article', 'project-card')

  const icon = document.createElement('img')
  icon.src = project.icon
  icon.alt = ''
  icon.className = 'project-card-icon'
  icon.width = 40
  icon.height = 40

  const hook = el('h3', 'project-card-hook')
  hook.textContent = project.hook

  const list = el('ul', 'project-card-facts')
  for (const fact of project.facts) {
    const item = document.createElement('li')
    item.textContent = fact
    list.appendChild(item)
  }

  card.append(icon, hook, list)
  return card
}

export function renderProjectGroup(
  groupName: string,
  projects: ProjectCard[],
): HTMLElement {
  const section = el('section', 'project-group')
  const heading = el('h2', 'fig-label')
  heading.textContent = groupName

  const grid = el('div', 'project-grid')
  for (const project of projects) {
    grid.appendChild(renderProjectCard(project))
  }

  section.append(heading, grid)
  return section
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/brianjones/Development/GitHub/resume-site/site
npx tsc -b --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/src/components/projectCard.ts
git commit -m "Add project card and project group rendering"
```

---

### Task 5: Layout assembly (Persistent Split + mobile collapse)

**Files:**
- Create: `site/src/styles/layout.css`
- Modify: `site/src/main.ts`
- Modify: `site/index.html`

- [ ] **Step 1: Create `site/src/styles/layout.css`**

```css
.page-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 20px;
}

.side-panel {
  position: sticky;
  top: 24px;
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-column {
  flex: 1;
  min-width: 0;
}

.chat-widget {
  border: 1.5px solid var(--blueprint-accent);
  border-radius: 6px;
  background: var(--blueprint-surface);
  display: flex;
  flex-direction: column;
  max-height: 480px;
}

.chat-toggle-bar {
  display: none;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-bubble {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  max-width: 90%;
}

.chat-bubble-user {
  align-self: flex-end;
  background: var(--blueprint-accent);
  color: #fff;
}

.chat-bubble-assistant {
  align-self: flex-start;
  background: var(--blueprint-grid-line);
  color: var(--blueprint-ink);
}

.chat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 10px 8px;
}

.chat-chip {
  font-size: 11px;
  padding: 4px 8px;
  border: 1px solid var(--blueprint-accent);
  border-radius: 12px;
  background: transparent;
  color: var(--blueprint-accent);
  cursor: pointer;
}

.chat-form {
  display: flex;
  gap: 6px;
  padding: 10px;
  border-top: 1px solid var(--blueprint-grid-line);
}

.chat-form input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--blueprint-grid-line);
  border-radius: 4px;
  font-family: var(--font-sans);
}

.chat-form button {
  padding: 8px 14px;
  background: var(--blueprint-accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.chat-gate {
  padding: 10px;
  font-size: 13px;
  text-align: center;
}

.project-group {
  margin-top: 32px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 8px;
}

.project-card {
  border: 1px solid var(--blueprint-grid-line);
  border-radius: 6px;
  padding: 14px;
  background: var(--blueprint-surface);
}

.project-card-icon {
  display: block;
  margin-bottom: 8px;
}

.project-card-hook {
  font-size: 14px;
  margin: 0 0 8px;
  color: var(--blueprint-accent-strong);
}

.project-card-facts {
  margin: 0;
  padding-left: 16px;
  font-size: 12.5px;
  color: var(--blueprint-ink-muted);
}

.project-card-facts li {
  margin-bottom: 4px;
}

@media (max-width: 860px) {
  .page-layout {
    flex-direction: column;
  }

  .side-panel {
    position: static;
    width: 100%;
  }

  .chat-widget {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    max-height: 60vh;
    border-radius: 8px 8px 0 0;
    transform: translateY(calc(100% - 44px));
    transition: transform 0.2s ease;
  }

  .chat-widget.chat-widget-expanded {
    transform: translateY(0);
  }

  .chat-toggle-bar {
    display: block;
    width: 100%;
    padding: 12px;
    background: var(--blueprint-accent);
    color: #fff;
    border: none;
    font-family: var(--font-sans);
    font-size: 13px;
    cursor: pointer;
  }
}
```

- [ ] **Step 2: Rewrite `site/src/main.ts` to assemble the full page**

```typescript
// site/src/main.ts
import { createChatWidget } from './components/chatWidget'
import { renderProjectGroup } from './components/projectCard'
import { PROJECTS } from './data/projects'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function buildHero(): HTMLElement {
  const hero = el('div')
  const label = el('div', 'fig-label')
  label.textContent = 'FIG. 01 — RESUME.SYSTEM'

  const heading = el('h1')
  heading.textContent = 'Brian Jones'

  const tagline = el('p')
  tagline.textContent =
    'Senior Full-Stack & AI Automation Engineer · Engineering Manager'

  const links = el('p')
  const classicLink = document.createElement('a')
  classicLink.href = '/resume/classic/'
  classicLink.textContent = 'View the traditional resume →'
  links.appendChild(classicLink)

  hero.append(label, heading, tagline, links)
  return hero
}

function groupProjects() {
  const groups = new Map<string, typeof PROJECTS>()
  for (const project of PROJECTS) {
    const existing = groups.get(project.group) ?? []
    existing.push(project)
    groups.set(project.group, existing)
  }
  return groups
}

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  const layout = el('div', 'page-layout')

  const sidePanel = el('div', 'side-panel')
  sidePanel.appendChild(createChatWidget())

  const contentColumn = el('div', 'content-column')
  contentColumn.appendChild(buildHero())

  for (const [groupName, projects] of groupProjects()) {
    contentColumn.appendChild(renderProjectGroup(groupName, projects))
  }

  layout.append(sidePanel, contentColumn)
  app.appendChild(layout)
}
```

- [ ] **Step 3: Add the layout stylesheet to `site/index.html`**

```html
<link rel="stylesheet" href="/src/styles/layout.css" />
```

(Add this line right after the existing `theme.css` link.)

- [ ] **Step 4: Verify the build and preview**

```bash
cd /Users/brianjones/Development/GitHub/resume-site/site
npm run build
npm run preview -- --port 5184 &
sleep 2
curl -s http://localhost:5184/resume/ | grep -o "Brian Jones"
kill %1
```

Expected: prints `Brian Jones`. Then open
`http://localhost:5184/resume/` in an actual browser and confirm visually:
the chat panel sits to the left and stays in place while scrolling the
project cards on the right; narrowing the window below 860px collapses the
chat into a bottom bar that expands on tap.

- [ ] **Step 5: Commit**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/src/styles/layout.css site/src/main.ts site/index.html
git commit -m "Assemble Persistent Split layout with mobile collapse behavior"
```

---

### Task 6: Accessibility pass

**Files:**
- Modify: `site/src/styles/theme.css`
- Modify: `site/src/styles/layout.css`

- [ ] **Step 1: Verify color contrast**

The blueprint accent `#3b6ea5` on the blueprint background `#f4f7fb` and on
white (`#ffffff`) both need to meet WCAG AA (4.5:1 for normal text, 3:1 for
large text/UI components). Check with a contrast calculator or:

```bash
python3 -c "
def luminance(hex_color):
    hex_color = hex_color.lstrip('#')
    r, g, b = (int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))
    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(hex1, hex2):
    l1, l2 = luminance(hex1), luminance(hex2)
    l1, l2 = max(l1, l2), min(l1, l2)
    return (l1 + 0.05) / (l2 + 0.05)

print('accent on bg:', contrast('#3b6ea5', '#f4f7fb'))
print('accent on white:', contrast('#3b6ea5', '#ffffff'))
print('ink on bg:', contrast('#1a2b3c', '#f4f7fb'))
"
```

Expected: all three ratios above 4.5. If `accent on bg` or `accent on
white` falls short, darken `--blueprint-accent` in `theme.css` (e.g. to
`#2f5c8a`) and re-run this check until it passes.

- [ ] **Step 2: Verify keyboard navigation**

In a browser with the dev server running, tab through the page: focus
should move through the chat input, suggestion chips, the chat send button,
then into the project cards' content in visual order. No element should be
unreachable by keyboard alone. Fix any tab-order issues by adding explicit
`tabindex="0"` only where semantic HTML doesn't already make an element
focusable (buttons and inputs already are — this should mostly just work).

- [ ] **Step 3: Verify screen-reader text on icons**

Confirm `site/src/components/projectCard.ts`'s icon `<img>` has `alt=""`
(decorative — the hook and facts already convey the meaning in text, so an
empty alt is correct here per WCAG, not a bug).

- [ ] **Step 4: Commit any contrast fixes**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/src/styles/theme.css site/src/styles/layout.css
git commit -m "Fix color contrast to meet WCAG AA" --allow-empty
```

(`--allow-empty` covers the case where Step 1 already passed and there was
nothing to change.)

---

### Task 7: Final Lighthouse/pa11y QA pass and deploy

**Files:** none (verification only)

- [ ] **Step 1: Install QA tools if not already available**

```bash
npx --yes lighthouse --version
npx --yes pa11y --version
```

- [ ] **Step 2: Push and let the deploy workflow run**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git push
gh run watch --exit-status $(gh run list --workflow=deploy-site.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: workflow succeeds.

- [ ] **Step 3: Run Lighthouse against the live site**

```bash
npx --yes lighthouse https://diegobkc.github.io/resume/ --preset=desktop --output=json --output-path=/tmp/lighthouse-report.json --chrome-flags="--headless"
python3 -c "
import json
data = json.load(open('/tmp/lighthouse-report.json'))
print('Performance:', round(data['categories']['performance']['score'] * 100))
print('Accessibility:', round(data['categories']['accessibility']['score'] * 100))
"
```

Expected per spec §9: performance ≥90. If below, check the duck asset's
file size first (Plan `2026-09-20-duck-asset-pipeline.md`'s budget) — it's
the most likely culprit if this page is slow.

- [ ] **Step 4: Run pa11y against the live site**

```bash
npx --yes pa11y https://diegobkc.github.io/resume/
```

Expected: no errors. Fix any reported issues and repeat Steps 2–4 until
clean.

- [ ] **Step 5: Final manual smoke test**

Open `https://diegobkc.github.io/resume/` in an actual browser (desktop and
a phone or responsive dev-tools view). Send a real message through the
chat (completing the real Turnstile challenge) and confirm a real,
grounded, streamed response comes back. Confirm `/resume/classic/` still
serves the traditional resume and PDF download.

---

## Definition of done for this plan

- The chat widget works end to end against the live Worker: Turnstile
  gate, streamed responses, suggestion chips, and graceful error messages
  for rate-limit/budget/session-expired cases.
- All nine project cards render, grouped by DH Pace AIS / DFPP LLC /
  Volunteer, matching spec §6 (including the DFPP Agency card staying
  brief/brand-only).
- Persistent Split layout works on desktop; mobile collapses the chat to a
  bottom bar that expands on tap.
- Lighthouse performance ≥90, pa11y clean, on the live deployed site.
- This plan, combined with the repo scaffold, Worker, and duck asset plans,
  completes the interactive resume described in the design spec.
