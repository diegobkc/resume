# Resume Repo Scaffold & Deploy Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `diegobkc/resume` from two static files into a real project (Vite frontend scaffold, moved-aside classic resume, CI deploy to GitHub Pages) so the interactive experience (built in later plans) has somewhere to live.

**Architecture:** `/site` is a Vite + vanilla TypeScript project that builds to `/site/dist`, published to GitHub Pages by a GitHub Actions workflow on every push to `main`. `/classic` holds today's traditional resume (`index.html`, `resume.pdf`) moved verbatim. The GitHub Pages base path is `/resume/` since this is a project page, not a user page — every asset URL and the Vite `base` config must account for that.

**Tech Stack:** Vite 8, TypeScript 5, GitHub Actions (`actions/upload-pages-artifact`, `actions/deploy-pages`).

Refers to spec: `docs/superpowers/specs/2026-09-20-interactive-resume-design.md`, §3 (Architecture).

---

### Task 1: Move the traditional resume to `/classic`

**Files:**
- Move: `index.html` → `classic/index.html`
- Move: `resume.pdf` → `classic/resume.pdf`

- [ ] **Step 1: Move the files with git so history is preserved**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
mkdir -p classic
git mv index.html classic/index.html
git mv resume.pdf classic/resume.pdf
```

- [ ] **Step 2: Fix the internal PDF link inside the moved page**

The page has a `<a href="resume.pdf">Download PDF</a>` link that still works
unchanged since `resume.pdf` now sits next to `classic/index.html` in the
same directory. Verify this is still true:

```bash
grep -n 'href="resume.pdf"' classic/index.html
```

Expected: one match, unchanged. No edit needed — both files moved together.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Move traditional resume to /classic ahead of interactive rebuild"
```

---

### Task 2: Scaffold the Vite + TypeScript project in `/site`

**Files:**
- Create: `site/package.json`
- Create: `site/tsconfig.json`
- Create: `site/vite.config.ts`
- Create: `site/index.html`
- Create: `site/src/main.ts`
- Create: `site/src/styles/theme.css`
- Create: `site/.gitignore`

- [ ] **Step 1: Create `site/package.json`**

```json
{
  "name": "resume-site-app",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^8.3.0"
  },
  "dependencies": {
    "@google/model-viewer": "^4.3.1"
  }
}
```

- [ ] **Step 2: Create `site/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `site/vite.config.ts`**

The `base: '/resume/'` is required — this is a GitHub Pages *project* page
(`diegobkc.github.io/resume/`), not a user page, so every built asset URL
must be prefixed with `/resume/` or the deployed site will 404 on its own
JS/CSS.

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/resume/',
  build: {
    outDir: 'dist',
  },
})
```

- [ ] **Step 4: Create `site/index.html`**

Minimal placeholder for now — later plans replace the body content with the
real layout. This step just proves the build pipeline works end to end.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Brian Jones — Resume</title>
  <link rel="stylesheet" href="/src/styles/theme.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create `site/src/styles/theme.css`**

Systems Blueprint design tokens (spec §7) — the fine grid background, the
safety-blue accent, and the type scale everything else builds on.

```css
:root {
  --blueprint-bg: #f4f7fb;
  --blueprint-grid-line: #dbe6f0;
  --blueprint-ink: #1a2b3c;
  --blueprint-ink-muted: #4a5b6c;
  --blueprint-accent: #3b6ea5;
  --blueprint-accent-strong: #1e4a75;
  --blueprint-surface: #ffffff;
  --font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
  --grid-size: 14px;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  color: var(--blueprint-ink);
  background-color: var(--blueprint-bg);
  background-image:
    linear-gradient(var(--blueprint-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--blueprint-grid-line) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}

#app {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px;
}

.fig-label {
  font-size: 11px;
  letter-spacing: 1.5px;
  color: var(--blueprint-accent);
  text-transform: uppercase;
}
```

- [ ] **Step 6: Create `site/src/main.ts`**

Placeholder bootstrap — proves TypeScript compiles and the module loads.
Builds the placeholder via safe DOM methods (`createElement`/`textContent`),
not `innerHTML`, establishing the pattern the chat widget (which renders
model output) must also follow later. Later plans replace this file's
contents entirely.

```typescript
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  return node
}

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  const label = el('div', 'FIG. 01 — RESUME.SYSTEM')
  label.className = 'fig-label'

  const heading = el('h1', 'Brian Jones')
  const tagline = el(
    'p',
    'Senior Full-Stack & AI Automation Engineer · Engineering Manager',
  )

  const classicLink = el('a', 'View the traditional resume →')
  classicLink.href = '/resume/classic/'
  const classicPara = el('p')
  classicPara.appendChild(classicLink)

  app.append(label, heading, tagline, classicPara)
}
```

- [ ] **Step 7: Create `site/.gitignore`**

```
node_modules/
dist/
*.local
```

- [ ] **Step 8: Install dependencies and verify the build**

```bash
cd /Users/brianjones/Development/GitHub/resume-site/site
npm install
npm run build
```

Expected: exits 0, creates `site/dist/index.html` and a hashed JS/CSS bundle
under `site/dist/assets/`.

- [ ] **Step 9: Verify the dev server serves the placeholder**

```bash
npm run dev -- --port 5183 &
sleep 2
curl -s http://localhost:5183/ | grep -o "Brian Jones"
kill %1
```

Expected: prints `Brian Jones`.

- [ ] **Step 10: Commit**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/package.json site/tsconfig.json site/vite.config.ts \
  site/index.html site/src/main.ts site/src/styles/theme.css site/.gitignore
git commit -m "Scaffold Vite + TypeScript frontend with Systems Blueprint theme tokens"
```

Note: `site/package-lock.json` will also exist after `npm install` — commit
it too:

```bash
git add site/package-lock.json
git commit -m "Add site package-lock.json"
```

---

### Task 3: GitHub Actions workflow to deploy `/site` to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy-site.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Deploy resume site

on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: site/package-lock.json
      - name: Install
        working-directory: site
        run: npm ci
      - name: Build
        working-directory: site
        run: npm run build
      - name: Copy classic resume into build output
        run: cp -r classic site/dist/classic
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The `cp -r classic site/dist/classic` step is what keeps
`diegobkc.github.io/resume/classic/` alive — without it, the built `dist`
only contains the new interactive app and the traditional resume would
disappear from that URL.

- [ ] **Step 2: Set the repo's Pages source to GitHub Actions**

The Pages site is currently configured to deploy from the `main` branch
directly (set up in the prior spec's rollout, before this restructure). It
needs to switch to the Actions build output instead:

```bash
echo '{"build_type":"workflow"}' | gh api --method PUT repos/diegobkc/resume/pages --input -
```

Expected: JSON response with `"build_type":"workflow"`.

- [ ] **Step 3: Commit and push**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add .github/workflows/deploy-site.yml
git commit -m "Add GitHub Actions workflow to build and deploy the site via Pages"
git push
```

- [ ] **Step 4: Verify the deploy succeeded**

```bash
gh run watch --exit-status $(gh run list --workflow=deploy-site.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: workflow completes with conclusion `success`.

- [ ] **Step 5: Verify both URLs are live**

```bash
curl -s -o /dev/null -w "root: %{http_code}\n" https://diegobkc.github.io/resume/
curl -s -o /dev/null -w "classic: %{http_code}\n" https://diegobkc.github.io/resume/classic/
curl -s https://diegobkc.github.io/resume/ | grep -o "Brian Jones"
```

Expected: both `200`, and `Brian Jones` printed (confirms the new
placeholder page is what's live, not a cached old version).

---

### Task 4: Update the repo README for the new structure

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the README content**

```markdown
# Brian Jones — Resume

Live at https://diegobkc.github.io/resume/ (interactive front door).
Traditional resume: https://diegobkc.github.io/resume/classic/

## Structure

- `/site` — Vite + TypeScript frontend for the interactive experience.
  `npm run build` in this directory produces `site/dist`, which is what
  GitHub Actions publishes to Pages.
- `/worker` — Cloudflare Worker powering the "ask me anything" concierge
  chat API (added in a later phase).
- `/classic` — the traditional static resume (`index.html` + `resume.pdf`),
  copied into the Pages build output at `/classic/` by the deploy workflow
  so it stays reachable.
- `docs/superpowers/` — design spec and implementation plans for this
  project.

## Updating content

- Traditional resume changes: edit `classic/index.html` directly (it's a
  standalone static page, no build step).
- Interactive site changes: edit files under `site/src`, then push to
  `main` — GitHub Actions rebuilds and redeploys automatically.
- Concierge knowledge base: `worker/knowledge.md` (added in a later phase)
  is maintained by hand and does **not** auto-sync with the resume content
  — update both when project facts change.
```

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "Document new repo structure in README"
git push
```

---

## Definition of done for this plan

- `diegobkc.github.io/resume/` serves the new (still placeholder) Vite app.
- `diegobkc.github.io/resume/classic/` serves the untouched traditional
  resume and its PDF.
- Every push to `main` rebuilds and redeploys automatically via GitHub
  Actions.
- Later plans (Worker backend, duck asset, chat widget, project showcase)
  build on top of `site/src/main.ts` and `site/src/styles/theme.css`
  without needing to touch this plan's files again except to extend them.
