# Interactive resume: build-time prerender for AI/crawler readability

## Problem

The interactive front door (`site/`, deployed to `https://diegobkc.github.io/resume/`)
is a pure client-rendered SPA: `site/index.html` ships an empty `<div id="app"></div>`,
and all content (hero, project cards) is built by `site/src/main.ts` via DOM APIs at
runtime. A plain HTTP fetch with no JS execution — which is how AI tools typically read
a pasted URL — only sees the `<title>` tag. This was confirmed directly: a user pasted
the resume link into an AI engine and it reported it could only read the title.

`classic/index.html` (the traditional resume, served at `/classic/`) is already static
HTML with real content and a meta description, so it's unaffected by this problem. This
work is scoped to the interactive front door only.

## Goal

Any plain HTTP fetch of `https://diegobkc.github.io/resume/` — no JS execution — returns
HTML containing the real hero text and all project card content (hooks + facts), not
just the page title.

## Non-goals

- Meta description / Open Graph / Twitter card tags on `site/index.html`.
- JSON-LD structured data (e.g. `Person` schema).
- `robots.txt` / `sitemap.xml` / `llms.txt`.

These are cheap, complementary follow-ups but are explicitly out of scope for this pass
(confirmed with the user, who chose "full prerender" over "both metadata and
prerender").

## Approach

Build-time prerendering via jsdom, reusing the existing render functions as the single
source of truth (no parallel string-template markup to keep in sync).

Two other approaches were considered and rejected:
- **Headless-browser snapshot (Playwright)**: most drift-proof, but adds a full browser
  to the build pipeline — heavier CI and a new devDependency category this repo doesn't
  otherwise need for a personal resume site.
- **Hand-written string templates**: no new dependency, but requires rewriting working
  DOM-building code into string templates, creating two markup code paths (DOM-building
  for something, string-building for prerender) to keep in sync by hand.

### Architecture

A new build script, `site/scripts/prerender.mjs` (ESM, Node), runs after `vite build`:

1. Installs a jsdom `window`/`document` as globals. `buildHero`, `buildGroupNav`, and
   `renderProjectGroup`/`renderProjectCard` all call `document.createElement` directly
   and don't otherwise depend on a browser environment, so this is sufficient — no
   virtualized/headless browser needed.
2. Imports the same modules `main.ts` uses: `buildHero`-equivalent hero builder,
   `buildGroupNav`, `renderProjectGroup`, and `PROJECTS` from `site/src/data/projects.ts`.
   (The hero-building logic currently lives inline in `main.ts` as `buildHero()` — it
   needs to be exported so the prerender script can import it; this is a pure
   export-visibility change, not a rewrite.)
3. Builds the same DOM tree `main.ts` builds for `content-column` (hero, group nav,
   project groups), plus an **empty** `side-panel` placeholder div (reserves the 320px
   flex column so there's no layout shift when JS mounts the duck viewer/chat widget),
   wrapped in `page-layout` — matching the structure `main.ts` produces.
4. Serializes that DOM to an HTML string and writes it into the built
   `site/dist/index.html`, replacing the empty `<div id="app"></div>` content with the
   prerendered markup.

What's prerendered: hero (name, tagline, email `mailto:` link, link to `/resume/classic/`),
group nav, all project group headings, and all project cards (icon `<img>`, hook, facts
list).

What's *not* prerendered, and stays exactly as it is today (JS-mounted after load): the
3D duck viewer and the chat widget. Neither has meaningful text content, and both
genuinely require JS/WebGL/network.

### `main.ts` change

`app.appendChild(layout)` → `app.replaceChildren(layout)`. Without this, the live JS
render would be appended *after* the prerendered snapshot instead of replacing it,
producing visibly duplicated content once JS runs.

### Build/CI integration

- `site/package.json` build script: `tsc -b && vite build` → `tsc -b && vite build &&
  node scripts/prerender.mjs`.
- `jsdom` added as a `devDependency` of `site/`.
- `.github/workflows/deploy-site.yml` needs no change — it already just runs `npm run
  build` in `site/`.

### Testing / verification

- Run `npm run build` in `site/` locally, then inspect the generated
  `site/dist/index.html` directly (not via a browser) and confirm real project text
  (e.g. "Eight commission types, one workflow.") is present in the raw file. This is the
  direct test for the reported failure mode: a fetch with no JS execution.
- Load the built output in a browser (`vite preview` or equivalent) and confirm: no
  visible regression, no console errors, no duplicated content after JS mounts, and the
  card link-copy buttons / group-nav anchors still work post-hydration-replace.
- No new automated test suite is being added — this is a small build-script addition to
  a personal site with no existing test infrastructure for `site/` (unlike `worker/`,
  which has vitest). Manual verification per above is sufficient for this scope.

### Error handling

The prerender script runs at build time only, never in the request path, so a failure
here is a build-time break (CI fails loudly), not a runtime failure users or crawlers
could ever see. No special runtime error handling is needed. If `dist/index.html` is
missing or doesn't contain the expected `<div id="app">` marker when the script runs, it
should fail loudly (non-zero exit) rather than silently skip prerendering — a silent
skip would quietly regress back to the exact problem this work fixes.

## Open follow-ups (explicitly not part of this work)

- Add meta description, Open Graph/Twitter tags, and JSON-LD `Person` structured data to
  `site/index.html` (classic already has a meta description; the front door has none).
- `robots.txt` / `sitemap.xml` / `llms.txt` for discoverability (separate from the direct
  pasted-link fetch problem this work addresses).
