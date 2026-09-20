# Duck Asset Pipeline & Viewer Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the Quack Fortress duck — the interactive resume's signature 3D centerpiece — onto the page as a small, fast-loading, drag-to-rotate `<model-viewer>` element with a static poster fallback for `prefers-reduced-motion` and unsupported browsers.

**Architecture:** The hard, uncertain part (generating a well-posed duck, compressing it to a web-friendly size, rendering a fallback poster) is **already done and verified** — see "What's already been produced" below. This plan documents that pipeline for reproducibility, then covers the remaining, lower-risk work: getting the verified assets into `site/public/`, and building the `duck-viewer.ts` component that displays them.

**Tech Stack:** Higgsfield CLI (`tripo_3d` text-to-3D model), Blender 5.2 (headless Python scripting for compression and rendering), `@google/model-viewer` web component.

Refers to spec: `docs/superpowers/specs/2026-09-20-interactive-resume-design.md`, §8 (asset production pipeline).

---

## What's already been produced (session of 2026-09-20)

An earlier attempt reused an existing Quack Fortress duck asset, but its
pose (arms held out to the sides, per its own generation prompt: *"standing
fully upright in a relaxed A-pose... full body reference sheet"*) was a
texturing reference pose, unsuitable for display — confirmed by rendering
it and looking at the result. A fresh model was generated instead:

- **Generation job**: Higgsfield `tripo_3d` (text-to-3D), job id
  `49dfd8b9-44ce-406d-a1b8-303aa089fee3`, cost 5 credits. Prompt used:
  > "a cheerful cartoon duck mascot character, humanoid upright posture,
  > standing in a natural relaxed pose with both arms hanging down
  > naturally at its sides, duck head with a friendly expression, smooth
  > toy-like cel-shaded body, single continuous fused mesh, no separate
  > props, no weapon, no backpack, clean flat-color regions, game-ready
  > low-poly proportions, front-facing symmetrical pose, full body figure"

  Negative prompt: `"A-pose, arms out to sides, T-pose, arms raised,
  weapon, gun, backpack"`. Settings: `geometry_quality=detailed`,
  `texture_quality=detailed`.

  Result: a natural-posed, non-humanoid standing duck (wings tucked, not
  arms) — this traded away the Quack Fortress character's specific
  humanoid costume for a clean, safe, natural pose. Reviewed and approved
  for use as-is (see design decision below).

- **Compression**: raw output was 1,982,102 triangles across three
  4096×4096 textures (Color, NormalGL, ORM) — 57MB. `scripts/assets/
  compress_duck.py` decimates to 30,000 triangles, downscales textures to
  1024px, and exports with Draco mesh compression + WebP textures. Result:
  **244KB** (a 99.6% reduction), visually identical at display size when
  re-rendered and compared side by side.

- **Poster render**: `scripts/assets/render_duck_poster.py` renders a
  900×900 transparent-background PNG from a 3/4 angle with three-point
  lighting (key/fill/rim suns plus a soft world ambient fill, since flat
  single/dual-light renders left the underside pure black with no ambient
  contribution). Result: `duck-poster.png`, 357KB.

Both final assets and both scripts are already committed to this repo at
`scripts/assets/` (`duck-compressed.glb`, `duck-poster.png`,
`compress_duck.py`, `render_duck_poster.py`). The 57MB raw download
(`duck-raw.glb`) is intentionally gitignored — if it's ever needed again,
re-download it from the Higgsfield job history:

```bash
higgsfield generate get 49dfd8b9-44ce-406d-a1b8-303aa089fee3 --json
# then curl the result_url from that job's output
```

**Design decision, recorded for the record:** the final duck does not wear
the game's costume (bandana, scarf) — it reads as a clean, generic mascot
rather than a literal Quack Fortress character. This was a deliberate
trade-off, confirmed with Brian, in favor of a natural pose and
professional safety over exact brand fidelity. If a closer match to the
in-game character is wanted later, regenerate with a prompt that keeps the
humanoid costumed description while asking specifically for "arms resting
naturally at sides" rather than switching to a plain-animal-style prompt.

---

### Task 1: Copy the verified assets into the site

**Prerequisite:** Plan `2026-09-20-resume-repo-scaffold.md` complete (so
`site/public/` exists).

**Files:**
- Create: `site/public/duck.glb` (copy of `scripts/assets/duck-compressed.glb`)
- Create: `site/public/duck-poster.png` (copy of `scripts/assets/duck-poster.png`)

- [ ] **Step 1: Copy the files**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
mkdir -p site/public
cp scripts/assets/duck-compressed.glb site/public/duck.glb
cp scripts/assets/duck-poster.png site/public/duck-poster.png
ls -la site/public/duck.glb site/public/duck-poster.png
```

Expected: both files present, `duck.glb` around 244KB, `duck-poster.png`
around 357KB — comfortably inside the spec's 1.5MB single-asset budget and
the page's overall 3MB budget.

- [ ] **Step 2: Commit**

```bash
git add site/public/duck.glb site/public/duck-poster.png
git commit -m "Add duck 3D model and poster fallback to the site's public assets"
```

---

### Task 2: Duck viewer component

**Files:**
- Create: `site/src/components/duckViewer.ts`

- [ ] **Step 1: Create the component**

Registers `<model-viewer>` (imported as a side effect from
`@google/model-viewer`, already a dependency from Plan
`2026-09-20-resume-repo-scaffold.md` Task 2). Respects
`prefers-reduced-motion` by rendering a plain `<img>` of the poster instead
of an interactive 3D canvas — per spec §9.

```typescript
// site/src/components/duckViewer.ts
import '@google/model-viewer'

const DUCK_MODEL_SRC = '/resume/duck.glb'
const DUCK_POSTER_SRC = '/resume/duck-poster.png'

export function createDuckViewer(): HTMLElement {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (prefersReducedMotion) {
    const img = document.createElement('img')
    img.src = DUCK_POSTER_SRC
    img.alt = 'A stylized 3D duck mascot, standing'
    img.className = 'duck-viewer duck-viewer-static'
    img.width = 220
    img.height = 220
    return img
  }

  const viewer = document.createElement('model-viewer')
  viewer.setAttribute('src', DUCK_MODEL_SRC)
  viewer.setAttribute('poster', DUCK_POSTER_SRC)
  viewer.setAttribute('alt', 'A stylized 3D duck mascot, standing — drag to rotate')
  viewer.setAttribute('camera-controls', '')
  viewer.setAttribute('disable-zoom', '')
  viewer.setAttribute('loading', 'lazy')
  viewer.className = 'duck-viewer'
  return viewer
}
```

- [ ] **Step 2: Add duck-viewer sizing to `site/src/styles/layout.css`**

Append this block:

```css
.duck-viewer {
  width: 100%;
  height: 220px;
  border-radius: 6px;
  background: transparent;
}

.duck-viewer-static {
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
```

- [ ] **Step 3: Wire it into `site/src/main.ts`**

In the `sidePanel` assembly (added by Plan
`2026-09-20-chat-widget-and-showcase.md` Task 5), add the duck above the
chat widget:

```typescript
import { createDuckViewer } from './components/duckViewer'
```

And where `sidePanel.appendChild(createChatWidget())` is called, change to:

```typescript
sidePanel.append(createDuckViewer(), createChatWidget())
```

If this plan is being executed *before* the chat widget plan, instead
create `site/src/main.ts`'s side panel with just the duck for now:

```typescript
const sidePanel = el('div', 'side-panel')
sidePanel.appendChild(createDuckViewer())
app.appendChild(sidePanel)
```

(Plan `2026-09-20-chat-widget-and-showcase.md` Task 5 supersedes this with
the full layout — don't worry about exact duplication, whichever plan runs
second wins with the fuller `main.ts`.)

- [ ] **Step 4: Verify locally**

```bash
cd /Users/brianjones/Development/GitHub/resume-site/site
npm run build
npm run preview -- --port 5185 &
sleep 2
curl -s -o /dev/null -w "duck.glb: %{http_code}\n" http://localhost:5185/resume/duck.glb
curl -s -o /dev/null -w "duck-poster.png: %{http_code}\n" http://localhost:5185/resume/duck-poster.png
kill %1
```

Expected: both `200`.

Then open `http://localhost:5185/resume/` in an actual browser: the duck
should render, and dragging it should rotate it. Test the reduced-motion
path by enabling "reduce motion" in the OS accessibility settings (or via
Chrome DevTools → Rendering tab → "Emulate CSS media feature
prefers-reduced-motion: reduce") and reloading — the duck should now be a
static image instead of an interactive viewer.

- [ ] **Step 5: Commit**

```bash
cd /Users/brianjones/Development/GitHub/resume-site
git add site/src/components/duckViewer.ts site/src/styles/layout.css site/src/main.ts
git commit -m "Add duck 3D viewer component with reduced-motion fallback"
```

---

## Definition of done for this plan

- `duck.glb` (244KB) and `duck-poster.png` (357KB) are live under
  `/resume/` on the deployed site.
- The duck renders as an interactive, drag-to-rotate `<model-viewer>` by
  default, and as a static poster image when `prefers-reduced-motion` is
  set.
- The generation prompt, job id, and the pose trade-off decision are
  recorded above for anyone revisiting this later.
