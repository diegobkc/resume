# Interactive Resume — Design Spec

Date: 2026-09-20
Status: Approved by Brian, ready for implementation planning

## 1. Goal

Replace the plain static resume as the front door at `diegobkc.github.io/resume/`
with a genuinely distinctive, interactive experience — one that demonstrates
the exact skill set the resume claims (AI-assisted engineering, systems/workflow
architecture, asset pipeline craft) rather than just describing it. The
existing static resume is not retired — it moves to `/classic/` and stays one
click away, plus the downloadable PDF, so anyone who wants the traditional
format still gets it instantly.

Audience: roughly equal weight between technical hiring managers/recruiters
(who need fast credibility and easy verification) and Brian's broader
professional network (peers, DFPP clients — people who'll explore for the
experience itself, not just to evaluate a candidate).

## 2. What's explicitly out of scope

- No live GitHub activity graphs, animated timelines, or other "extra" visual
  gimmicks beyond the concierge + showcase. (Considered and declined in favor
  of a smaller, higher-craft surface area.)
- No automated sync between the resume content and the concierge's knowledge
  base — updating one requires manually updating the other. Documented as a
  known manual step, not automated.
- No analytics/tracking on the site.
- No abstract/non-duck 3D concept — the signature 3D element is specifically
  the Quack Fortress duck, reimagined.

## 3. Architecture

Repo: `diegobkc/resume` (existing, restructured — currently just two static
files with no build tooling or CI).

```
/site/      — Vite + vanilla TypeScript frontend. Builds to /site/dist,
              published to GitHub Pages via GitHub Actions on push to main.
/worker/    — Cloudflare Worker (TypeScript) hosting the concierge chat API
              at a workers.dev subdomain (or custom route later).
              Includes wrangler.toml, KV namespace bindings for rate
              limiting/budget tracking, and Vitest tests.
/classic/   — Today's traditional resume (index.html + resume.pdf), moved
              here verbatim. Linked prominently from the new front door
              (header button + footer link) and still downloadable as PDF.
docs/superpowers/specs/  — this spec and future ones.
```

Hosting stays split deliberately: GitHub Pages continues to serve the static
frontend (no change to the live URL), while the Cloudflare Worker is a
separate, small, independently deployable API surface — the same shape as
several of Brian's own production systems (frontend on one host, API on
Cloudflare Workers).

The frontend calls the Worker's `/api/chat` endpoint via `fetch` (CORS
enabled for the GitHub Pages origin only).

### CI/CD

- GitHub Actions: on push to `main`, build `/site` with Vite and publish
  `/site/dist` to GitHub Pages.
- Worker deploys via `wrangler deploy`, run manually by Brian when the worker
  changes (automating this via a second Actions job with a
  `CLOUDFLARE_API_TOKEN` secret is a possible future improvement, not part of
  this initial build).

## 4. The concierge (AI chat feature)

### 4.1 Purpose and framing

A chat widget grounded in Brian's actual project work, so a visitor can ask
things like "tell me about the AMIS trading system" and get a real, accurate
answer instead of having to read the whole page. It speaks about Brian in the
third person and discloses up front that it's an AI:

> "Hi — I'm an AI trained on Brian's actual project work. Ask me about his
> experience, or [see the traditional resume]."

This framing avoids impersonation (it never claims to *be* Brian) and heads
off a class of "make it say something embarrassing as if Brian said it"
attacks.

Suggested-question chips appear on load (e.g. "What's the AMIS trading
system?", "Tell me about the DH Pace team", "What's Quack Fortress?") so
visitors have an immediate, low-effort way in, and the breadth of what's
answerable is implicitly demonstrated.

### 4.2 Knowledge base

A single curated file, `worker/knowledge.md`, containing only vetted,
public-safe facts pulled from the resume and interview-prep material —
project descriptions, scale numbers, architecture decisions, written in
third person as the model's sole grounding source.

**Explicitly excluded** from this file: the interview-prep's private
coaching notes, "honest caveats" about what Brian doesn't know cold, any
job-search-strategy content, and anything that reads as a weakness rather
than a fact. The system prompt instructs the model to answer only from this
file, decline to speculate ("I don't have detail on that — happy to have
Brian follow up directly"), stay on professional topics, and never reveal
its own system prompt or internal instructions under prompt-injection
attempts.

**Known limitation, accepted:** this file will drift from the resume over
time since it's maintained by hand. The repo README calls this out
explicitly as a required manual step whenever the resume changes.

### 4.3 Guardrails

- Refuses off-topic requests (won't write code, won't do general assistant
  tasks, won't discuss anything outside the knowledge base).
- Refuses to speculate about salary expectations or any personal detail not
  present in the knowledge base.
- Short, direct refusals rather than apologetic essays.
- Verified before launch against a written set of adversarial prompts (see
  §8, Testing).

### 4.4 Model, streaming, and UX details

- Model: Claude Haiku — cheap, fast, sufficient for grounded Q&A over a fixed
  knowledge file.
- Responses stream token-by-token (matching Brian's own Vercel AI SDK /
  streamText usage elsewhere).
- Message length capped: ~500 characters in, ~300 tokens out, to bound cost
  per exchange.

### 4.5 Cost and abuse controls

- **Turnstile**: verified before a visitor's first message.
- **Per-visitor cap**: KV-backed counter, ~15 messages/day per IP.
- **Global daily spend ceiling**: tracked in KV, resets at UTC midnight; once
  crossed, the chat stops accepting new messages for the rest of the day.
- **Fallback UX**: when rate-limited or the daily cap is hit, the chat shows
  a static, friendly message ("The concierge is resting — here's the
  traditional resume and my email") rather than an error.

## 5. Page layout — Persistent Split

Two-column layout on desktop:

- **Left panel (sticky)**: the 3D duck centerpiece (small, drag-to-rotate)
  and the concierge chat input — stays visible the entire time the visitor
  scrolls the right panel. A recruiter can ask a question mid-read without
  losing their place.
- **Right panel (scrolling)**: hero blurb, the project showcase cards (§6),
  skills, and a footer with links to `/classic/`, the PDF, email, and
  GitHub.

**Mobile**: the two-column split collapses. The duck appears once, smaller,
in the hero at the top of the (now single) content column — it does not
follow the scroll on mobile. The chat becomes a collapsed bar pinned to the
bottom of the screen ("Ask me anything about Brian's work ↑") that expands
into a full-screen overlay when tapped, with a clear way to close it and
resume scrolling.

## 6. Project showcase — selected cards

Nine cards, organized into three groups mirroring the resume's own
structure:

**DH Pace — Business Analyst Manager, AIS**
1. The AIS team/role overview (leadership, AI-assisted delivery methodology)
2. Salesperson Incentive Review (SIR)
3. Credit Request (the platform)
4. Vendor PrePayment (VPP)

**DFPP LLC**
5. GarageLink
6. DFPP Agency (dfppagency.com) — **brief/brand-only card**: what DFPP Agency
   is and does, no specific delivered-outcome claims, since detailed backing
   material for it doesn't exist yet. Do not imply client results or metrics
   that aren't documented.
7. Productized site delivery (Client_Site_Development — the 32-skill/6-agent
   pipeline)
8. Infrastructure migration program (Netlify → Cloudflare Workers)

**Volunteer**
9. Quack Fortress (also the narrative/visual source of the duck — reading to
   the end of the cards closes the loop back to the hero)

Each card: one-line hook, 3-4 supporting facts (matching the resume's own
factual density), and a small blueprint-style line-art illustration unique
to its theme (see §7). The concierge can go deeper on any of these if asked
in chat — cards don't need to contain everything, since that's what the chat
is for.

## 7. Visual direction — Systems Blueprint

Light background, fine technical-grid lines, engineering-schematic motifs
(annotation-style labels, "FIG. 01" style figure numbers), safety-blue
accent color. Chosen specifically because it visually ties to Brian's actual
specialty — workflow/systems architecture, approval routing diagrams —
rather than a generic or "dark hacker cliché" aesthetic. Must stay
professional-credible for non-technical recruiters, not just technical
peers.

Typography and exact palette values are an implementation-time decision
(within the blueprint direction), not fixed by this spec.

## 8. Asset production pipeline

- **The duck**: Higgsfield generates the base 3D model/textures → Blender
  handles rigging fixes and a material/lighting pass to match the Systems
  Blueprint palette (safety-blue rim light, clean matte materials) → export
  optimization to a single compressed `.glb`, target **under 1.5MB**.
  Rendered via the `<model-viewer>` web component (built-in drag-to-rotate,
  no custom Three.js/WebGL code needed). Falls back to a static poster image
  on unsupported browsers or when `prefers-reduced-motion` is set.
- **Project card illustrations**: one small blueprint-style line-art
  icon/diagram per card (9 total). Either Higgsfield-generated and cleaned
  up, or hand-built SVG — the implementer judges which looks sharper once
  the first one is tried, and stays consistent across all nine once decided.
- **Compression discipline**: every asset gets weighed and compressed the
  same way Brian documented doing on Quack Fortress itself (235MB → 26.5MB,
  -89%) — a real, provable habit applied here, not just a claim on the page
  next to it.

## 9. Performance and accessibility budget

- Total initial page weight: **under 3MB**.
- Lighthouse performance: **≥90 on mobile**.
- The duck model lazy-loads after main content paint; `prefers-reduced-motion`
  gets the static poster image instead of an interactive canvas.
- Blueprint-blue-on-light-grid must pass WCAG AA contrast.
- Chat is fully keyboard-navigable.
- The duck has real alt text for screen readers (via `<model-viewer>`'s
  standard accessibility support).

## 10. Testing

- Vitest unit tests on the Worker's rate-limiter and daily-budget-cap logic.
- A written set of adversarial prompts (prompt-injection attempts,
  off-topic requests, "what's Brian's salary expectation") run against the
  concierge before launch, verifying the guardrails in §4.3 actually hold.
- Lighthouse and pa11y checks on the built site before it ships — the same
  gate Brian already uses on client work.

## 11. Rollout

1. Build `/site`, `/worker`, move current content to `/classic/`.
2. Deploy Worker to Cloudflare, wire up KV namespaces and secrets
   (Anthropic API key, Turnstile secret).
3. Deploy `/site` to GitHub Pages via the new Actions workflow.
4. Verify end-to-end on desktop and mobile, run the adversarial-prompt test
   pass, run Lighthouse/pa11y.
5. The private working copy's QR code and `diegobkc.github.io/resume` link
   need no change — they already point at the root URL, which now serves the
   new interactive experience instead of the old static page.
