// worker/src/knowledge.ts
// Curated, public-safe facts only. Written in third person so the model has
// a clear voice. Does NOT include anything from interview-prep.md's private
// coaching notes, honest caveats, or job-search strategy content — see
// design spec §4.2 for the exclusion rule. Update this by hand whenever the
// resume changes; it does not auto-sync.

export const KNOWLEDGE_BASE = `
BRIAN JONES — Senior Full-Stack & AI Automation Engineer / Engineering Manager
Belton, MO. Contact: brian.joneskc01@gmail.com, github.com/diegobkc, dfppagency.com.
20+ years building enterprise business applications, from SharePoint/K2/Oracle
APEX with Boomi and Oracle Integration Cloud integrations, to modern
TypeScript SaaS.

== DH PACE COMPANY — Business Analyst Manager, Application & Integration
   Services (AIS) team. Oct 2022–Present, Belton, MO. ==

Brian leads a team of systems analysts, senior business analysts, a
SharePoint administrator, and Oracle APEX developers. The team directs
requirements definition, workflow design, and delivery for internal
enterprise applications that automate approval-driven business processes:
commission review, credit and refund management, vendor payments, and field
payment collection. Brian built AI-assisted development into the team's
standing delivery methodology — Claude Code with multi-agent orchestration,
custom skills, and MCP server integration is used to scope, build, test, and
document software, including AI-generated technical specs, UAT checklists,
and executive summaries.

Flagship AIS projects:

- Salesperson Incentive Review (SIR): replaced a manual, spreadsheet-driven
  commission audit process with a 4-stage, AD-role-gated approval workflow
  (a role-gated chain) spanning eight distinct
  commission line types, plus batch toolbar actions letting a reviewer act
  on multiple records at once instead of one at a time. Built with
  React/TypeScript, MUI X Data Grid, Node/Express, Oracle APEX ORDS, SQL
  Server, and Microsoft Entra ID SSO, with a self-hosted GitHub Actions
  CI/CD pipeline per environment (Dev, UAT, Production).

- Credit Request (internally called the platform): a unified the ERP/the ERP credit-and-
  refund platform replacing a disconnected process of SharePoint forms and
  email chains. Scoped as a 3-phase, roughly 263-story-point initiative
  (three internal phases) with a full
  requirements traceability matrix. Features a configurable 5-stage
  approval workflow (a multi-tier management chain
  ) with dollar-threshold-gated routing (
  General Manager review) and automatic org-hierarchy-based approver
  assignment. Integrates with the ERP via SOAP for automatic invoice
  auto-population.

- Vendor PrePayment (VPP): migrated DH Pace's vendor pre-payment approval
  process off a legacy Nintex/SharePoint workflow onto a custom-built
  application. Brian reverse-engineered an undocumented legacy approval path into a
  data-driven, location-based approver-matching algorithm (matching by
  company and location against an approvers table, supporting up to
  three levels of sign-off) — replacing Nintex's hard-coded logic with
  configurable database rules. Delivered with a 25+ script SQL migration
  history and a Playwright end-to-end test suite. The application passed a
  formal pre-deployment security and code-quality audit with scores of
  strong marks across security, code quality, and production
  readiness), receiving a "GO" recommendation and clearing nearly all OWASP
  Top 10 categories outright.

- field-payment processing: a proof-of-concept application automating
  collection and submission of technician-collected field payments (card
  and check) on ERP work orders, via a secure proxy layer to the ERP's
  the ERP's payment API API with rate limiting and full audit logging.

== DFPP LLC — Founder & Principal Engineer. 2025–Present, Kansas City, MO. ==

Brian solo-builds and operates a portfolio of production web, mobile, and
automation products on a converged stack (Next.js 15, React 19, TypeScript,
Neon Postgres with Drizzle, Clerk, Express, N8N, Cloudflare) — roughly 3,000
commits across 40+ repositories.

- GarageLink (garagelink.io): a multi-tenant scheduling and customer-
  communication SaaS for independent auto shops. Express 5/TypeScript API,
  three React single-page apps (customer, shop owner, admin), accountless
  customer authentication via 90-day signed links, and six N8N workflows
  (24-hour reminders, maintenance recalls, idempotent auto-cancel/nudge
  loops) over Resend email and OpenPhone SMS.

- DFPP Agency (dfppagency.com): Brian's client-services brand and agency
  under DFPP LLC, delivering N8N-based workflow automation for service
  businesses.

- AMIS trading system: an automated forex/equities trading engine that uses
  Claude as the signal evaluator, with layered risk controls including an
  LLM-failure circuit breaker, drawdown gates, news-blackout and
  directional-bias gates, 1%-risk position sizing, and an emergency stop.

- Agent Action Ledger: an audit-trail and observability platform for AI
  coding agents, with hook plugins for five different agents (Claude Code,
  Gemini CLI, Copilot, Windsurf, Cline), API-key authentication, rate
  limiting, and a streaming anomaly-detection pipeline.

- DFPP Academy: a live K-12 AI-education platform for minors, built with a
  COPPA-constrained data schema (no student email, phone, or photo — grade
  and age band only), mandatory staff MFA, and a documented threat model.

- Productized site delivery (Client_Site_Development): a pipeline of 32
  Claude Code skills and 6 specialist agents covering prospect intake,
  performance baselining, mockup building, and production handoff — used to
  deploy vertical demo sites and improve real client sites' performance and
  accessibility scores.

- Infrastructure migration program: moved five production properties from
  Netlify to Cloudflare Workers, using black-box baseline test suites
  required to pass against both the old site and the new preview before
  cutover, with a 48–72 hour rollback window.

== VOLUNTEER — AI-Assisted Game Development. 2026–Present. ==

Brian mentors at-risk youth in Detroit through hands-on, AI-assisted game
development, using real production engineering practice as the curriculum.
The project is Quack Fortress, a build-by-day/survive-by-night roguelike on
Roblox — 264 commits across 11 milestones in about 10 days, 13,250+ lines of
strictly-typed Luau, and 374 automated tests enforced by lint and format
gates. The engineering practices taught include test-driven development, a
server-authoritative client/server architecture, structured design
documents, and code review discipline.

== EARLIER CAREER ==

Applications Developer / Workflow Developer, San Francisco Fire Credit
Union (2019–2022): built web, mobile, and desktop financial-operations
applications with .NET, WPF, Power Automate, and SharePoint, and led
integration of K2 workflow solutions.

Software Development Team Lead, Polsinelli PC (2013–2019): managed the
development lifecycle for client-facing and internal SharePoint/K2
applications in a legal enterprise environment.

Earlier and contract roles (2004–2018): K2 development, SharePoint
architecture, and database administration across Brazeway, Focused
Management, ScriptPro, Aptuit, and WSS.

== CORE TECHNICAL SKILLS ==

Frontend: React, Next.js, Vite, Tailwind, Material-UI, TanStack Query.
Backend: Node.js, Express, Fastify, C#/.NET.
Data: PostgreSQL, Oracle APEX/ORDS, SQL Server, Redis.
AI & automation: Claude API, Vercel AI SDK, Cloudflare Agents SDK, N8N,
Claude Code skills/agents/MCP integrations.
Cloud & ops: Cloudflare Workers, Netlify, GitHub Actions, Docker.
Auth & security: Clerk, JWT, Microsoft Entra ID SSO, Windows Authentication,
OWASP-aligned hardening.
Testing: Vitest, Jest, Playwright, TDD.
`.trim()
