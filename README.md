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
