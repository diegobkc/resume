# Interactive Resume Prerender Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `https://diegobkc.github.io/resume/` return real hero + project text in its raw HTML (no JS execution required), fixing the reported failure where an AI engine fetching the link could only read the `<title>`.

**Architecture:** Extract the pure, static-data-driven DOM-building logic (hero, group nav, project cards) out of `main.ts`'s side-effecting bootstrap into a standalone module (`site/src/page.ts`). A new Node build script (`site/scripts/prerender.ts`) uses `jsdom` to call that same module in a fake DOM, serializes the result, and splices it into `dist/index.html`'s `#app` div after `vite build`. `main.ts` is updated to cleanly replace that prerendered snapshot with its live interactive render on load.

**Tech Stack:** Vite + TypeScript (existing), `jsdom` (new devDependency, provides a Node-side DOM for the prerender script), `tsx` (new devDependency, runs the TypeScript prerender script directly without a separate compile step).

**Spec:** `docs/superpowers/specs/2026-09-21-interactive-resume-prerender-design.md`

---

### Task 1: Extract the shared `el` DOM helper

Both `site/src/main.ts` and `site/src/components/projectCard.ts` currently define an identical private `el()` helper. Task 2 adds a third file (`page.ts`) that needs the same helper — consolidate now rather than adding a third copy.

**Files:**
- Create: `site/src/lib/dom.ts`
- Modify: `site/src/main.ts`
- Modify: `site/src/components/projectCard.ts`

- [ ] **Step 1: Create the shared helper**

`site/src/lib/dom.ts`:
```ts
// site/src/lib/dom.ts
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}
```

- [ ] **Step 2: Remove the local copy from `main.ts` and import the shared one**

In `site/src/main.ts`, delete this block (currently lines 8–15):
```ts
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}
```
Add `import { el } from './lib/dom'` alongside the other imports at the top of the file. The rest of `main.ts` is unchanged in this step — it still has its own `buildHero`/`buildGroupNav`/`groupProjects` functions and the same bootstrap block (those move in Task 2).

- [ ] **Step 3: Remove the local copy from `projectCard.ts` and import the shared one**

In `site/src/components/projectCard.ts`, delete this block (currently lines 5–12):
```ts
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}
```
Add `import { el } from '../lib/dom'` alongside the existing `import type { ProjectCard } from '../data/projects'` and `import { track } from '../lib/analytics'` lines. Everything else in the file (`createCardLinkButton`, `renderProjectCard`, `renderProjectGroup`, `slugifyGroupName`) is unchanged.

- [ ] **Step 4: Verify it builds**

Run: `cd site && npm run build`
Expected: completes with no TypeScript errors (this is a pure extraction — no behavior change).

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/dom.ts site/src/main.ts site/src/components/projectCard.ts
git commit -m "Extract shared el() DOM helper into site/src/lib/dom.ts"
```

---

### Task 2: Extract page-content builders into `site/src/page.ts`

`main.ts` currently mixes pure, static-data-driven rendering (`buildHero`, `buildGroupNav`, `groupProjects`) with side-effecting bootstrap code (an analytics `track()` call that does a real network POST, and mounting the WebGL duck viewer / chat widget). The prerender script in Task 4 must be able to build the same content-column markup *without* triggering that analytics call or trying to mount WebGL/chat in Node. Splitting the pure builders into their own module gives both `main.ts` and the prerender script one shared, side-effect-free source of truth.

**Files:**
- Create: `site/src/page.ts`
- Modify: `site/src/main.ts`

- [ ] **Step 1: Create `site/src/page.ts`**

```ts
// site/src/page.ts
import { renderProjectGroup, slugifyGroupName } from './components/projectCard'
import { PROJECTS, type ProjectCard } from './data/projects'
import { el } from './lib/dom'

export function buildHero(): HTMLElement {
  const hero = el('div')
  const label = el('div', 'fig-label')
  label.textContent = 'FIG. 01 — RESUME.SYSTEM'

  const heading = el('h1')
  heading.textContent = 'Brian Jones'

  const tagline = el('p')
  tagline.textContent =
    'Senior Full-Stack & AI Automation Engineer · Engineering Manager'

  const contact = el('p', 'hero-contact')
  const emailLink = document.createElement('a')
  emailLink.href = 'mailto:brian.joneskc01@gmail.com'
  emailLink.textContent = 'brian.joneskc01@gmail.com'
  contact.appendChild(emailLink)

  const links = el('p')
  const classicLink = document.createElement('a')
  classicLink.href = '/resume/classic/'
  classicLink.textContent = 'View the traditional resume →'
  links.appendChild(classicLink)

  hero.append(label, heading, tagline, contact, links)
  return hero
}

export function buildGroupNav(groupNames: string[]): HTMLElement {
  const nav = el('nav', 'group-nav')
  nav.setAttribute('aria-label', 'Jump to a project group')
  for (const groupName of groupNames) {
    const link = document.createElement('a')
    link.href = `#${slugifyGroupName(groupName)}`
    link.className = 'group-nav-link'
    link.textContent = groupName
    nav.appendChild(link)
  }
  return nav
}

export function groupProjects(): Map<string, ProjectCard[]> {
  const groups = new Map<string, ProjectCard[]>()
  for (const project of PROJECTS) {
    const existing = groups.get(project.group) ?? []
    existing.push(project)
    groups.set(project.group, existing)
  }
  return groups
}

export function buildContentColumn(): HTMLElement {
  const contentColumn = el('div', 'content-column')
  contentColumn.appendChild(buildHero())

  const groups = groupProjects()
  contentColumn.appendChild(buildGroupNav([...groups.keys()]))

  for (const [groupName, projects] of groups) {
    contentColumn.appendChild(renderProjectGroup(groupName, projects))
  }

  return contentColumn
}
```

- [ ] **Step 2: Rewrite `site/src/main.ts` to use it**

Replace the full contents of `site/src/main.ts` with:
```ts
// site/src/main.ts
import { createChatWidget } from './components/chatWidget'
import { createDuckViewer } from './components/duckViewer'
import { el } from './lib/dom'
import { buildContentColumn } from './page'
import { track } from './lib/analytics'

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  track('page_view')

  const layout = el('div', 'page-layout')

  const sidePanel = el('div', 'side-panel')
  sidePanel.append(createDuckViewer(), createChatWidget())

  layout.append(sidePanel, buildContentColumn())

  app.replaceChildren(layout)
}
```
Note the last line: `app.replaceChildren(layout)` instead of the old `app.appendChild(layout)`. This is required for Task 5 — once `dist/index.html` ships with prerendered content already inside `#app`, `appendChild` would leave that prerendered copy in place and add the live version after it, visibly duplicating the whole page. `replaceChildren` swaps it out cleanly.

- [ ] **Step 3: Verify it builds**

Run: `cd site && npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 4: Manual browser check**

Run: `cd site && npm run preview`
Open the printed URL (will be `http://localhost:4173/resume/`) in a browser.
Expected: page looks identical to before this change — hero, group nav, all project cards, duck viewer, chat widget all present; no console errors; no duplicated content.

- [ ] **Step 5: Commit**

```bash
git add site/src/page.ts site/src/main.ts
git commit -m "Extract page content builders into site/src/page.ts; replaceChildren on mount"
```

---

### Task 3: Add `jsdom` and `tsx` as dev dependencies

**Files:**
- Modify: `site/package.json`
- Modify: `site/package-lock.json`

- [ ] **Step 1: Install**

Run: `cd site && npm install --save-dev jsdom tsx @types/jsdom`
Expected: `site/package.json` gains `jsdom`, `tsx`, and `@types/jsdom` under `devDependencies`; `site/package-lock.json` updates accordingly.

- [ ] **Step 2: Commit**

```bash
git add site/package.json site/package-lock.json
git commit -m "Add jsdom and tsx dev dependencies for build-time prerendering"
```

---

### Task 4: Write the prerender script

This script runs *after* `vite build` (wired up in Task 5). It assumes `site/dist/index.html` already exists with the built, empty `<div id="app"></div>` shell that `vite build` produces.

**Files:**
- Create: `site/scripts/prerender.ts`

- [ ] **Step 1: Write the script**

```ts
// site/scripts/prerender.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { el } from '../src/lib/dom'
import { buildContentColumn } from '../src/page'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
// @ts-expect-error -- installing a browser-like global; the imported render
// functions call document.createElement at call time, not at import time.
globalThis.document = dom.window.document

const layout = el('div', 'page-layout')
const sidePanel = el('div', 'side-panel')
layout.append(sidePanel, buildContentColumn())

const __dirname = dirname(fileURLToPath(import.meta.url))
const distIndexPath = resolve(__dirname, '../dist/index.html')
const html = readFileSync(distIndexPath, 'utf8')

const appMarker = '<div id="app"></div>'
if (!html.includes(appMarker)) {
  throw new Error(`prerender: expected to find ${appMarker} in ${distIndexPath}`)
}

const updated = html.replace(appMarker, `<div id="app">${layout.outerHTML}</div>`)
writeFileSync(distIndexPath, updated, 'utf8')
console.log('prerender: injected content into dist/index.html')
```

`sidePanel` is deliberately left empty — it reserves the 320px flex column that `.side-panel` occupies (see `site/src/styles/layout.css:46-49`) so there's no layout shift when `main.ts` mounts the real duck viewer and chat widget on top. It intentionally does not contain the 3D duck viewer or chat widget markup, since neither has meaningful text content and both require a real browser.

The `if (!html.includes(appMarker))` check makes a missing/renamed `#app` marker a loud build failure instead of a silent no-op — a silent skip here would quietly regress back to the exact bug this work fixes.

- [ ] **Step 2: Verify it runs standalone against an existing build**

Run: `cd site && npm run build && npx tsx scripts/prerender.ts`
Expected: the `npm run build` portion completes normally (this doesn't yet call the prerender script itself — that's Task 5), then the manual `npx tsx scripts/prerender.ts` prints `prerender: injected content into dist/index.html`.

- [ ] **Step 3: Verify the content actually landed**

Run: `grep -c "Eight commission types, one workflow." site/dist/index.html`
Expected: `1`

Run: `grep -c "Senior Full-Stack & AI Automation Engineer" site/dist/index.html`
Expected: `1`

- [ ] **Step 4: Commit**

```bash
git add site/scripts/prerender.ts
git commit -m "Add jsdom-based prerender script"
```

---

### Task 5: Wire the prerender script into the build, and do a full end-to-end check

**Files:**
- Modify: `site/package.json`

- [ ] **Step 1: Update the build script**

In `site/package.json`, change:
```json
"build": "tsc -b && vite build",
```
to:
```json
"build": "tsc -b && vite build && tsx scripts/prerender.ts",
```

- [ ] **Step 2: Run the full build from a clean slate**

Run: `cd site && rm -rf dist && npm run build`
Expected: `tsc -b` and `vite build` run as before, then `prerender: injected content into dist/index.html` prints at the end. (`vite build` empties `dist/` before writing, so this reproduces exactly what CI will produce.)

- [ ] **Step 3: Confirm full project coverage, not just the first card**

Run:
```bash
grep -c "Eight commission types, one workflow." site/dist/index.html
grep -c "Reverse-engineered an undocumented approval path" site/dist/index.html
grep -c "Two ERPs, one credit and refund platform" site/dist/index.html
```
Expected: each prints `1` (one project from each of the first three cards in `site/src/data/projects.ts`, confirming the whole `PROJECTS` list rendered, not just the first group).

- [ ] **Step 4: Confirm no duplication in the static artifact**

Run: `grep -c "Senior Full-Stack & AI Automation Engineer" site/dist/index.html`
Expected: `1` — the hero tagline should appear exactly once in the raw file. (A second copy would only ever appear in the live DOM after JS runs in a browser, never in the static file itself, since `main.ts` now uses `replaceChildren` rather than `appendChild`.)

- [ ] **Step 5: Browser check — the live interactive version still works and doesn't duplicate**

Run: `cd site && npm run preview`
Open `http://localhost:4173/resume/` in a browser. Expected:
- Page renders correctly, matching what it looked like before this work (visually).
- No duplicated hero/project content (confirms `replaceChildren` correctly swapped out the prerendered snapshot).
- No console errors.
- The project-card link-copy button (🔗 icon) still copies a link when clicked.
- Clicking a group-nav link still scrolls to the right section.
- The duck viewer and chat widget in the side panel still mount and work.

- [ ] **Step 6: Simulate the original failure mode directly**

This is the actual reproduction of the bug reported by the user (an AI engine fetching the link with no JS execution):
Run: `curl -s http://localhost:4173/resume/ | grep -c "Eight commission types, one workflow."` (with `npm run preview` still running from Step 5)
Expected: `1` — a plain HTTP GET, with zero JavaScript execution, now returns real project content.

- [ ] **Step 7: Commit**

```bash
git add site/package.json
git commit -m "Wire prerender script into the site build"
```

---

## Self-Review Notes

- **Spec coverage:** Architecture (Task 2 + 4), main.ts change (Task 2 Step 2), build/CI integration (Task 3 + 5 — no workflow file change needed since `.github/workflows/deploy-site.yml` already just runs `npm run build`), testing/verification (Task 5 Steps 2–6, matching the spec's "inspect raw dist/index.html" and "load in a browser" checks), error handling (Task 4's loud-failure marker check) are all covered.
- **Out of scope confirmed:** no task touches meta description/OG tags/JSON-LD/robots.txt/sitemap — matches the spec's explicit non-goals.
- **Type consistency:** `buildContentColumn`, `buildHero`, `buildGroupNav`, `groupProjects`, and `el` are named and exported identically everywhere they're defined (Task 2 Step 1) and consumed (Task 2 Step 2, Task 4 Step 1).
- **No deploy workflow change needed:** confirmed `.github/workflows/deploy-site.yml` runs `npm run build` in `site/` as its only build step, so the Task 5 `package.json` change is sufficient — CI will pick this up automatically on the next push to `main`.
