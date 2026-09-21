// site/src/data/projects.ts
export interface ProjectCard {
  id: string
  group: 'DHPace — Application Integration & Systems' | 'DFPP LLC' | 'Volunteer'
  icon: string
  hook: string
  facts: string[]
}

export const PROJECTS: ProjectCard[] = [
  {
    id: 'ais-overview',
    group: 'DHPace — Application Integration & Systems',
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
    group: 'DHPace — Application Integration & Systems',
    icon: '/resume/icons/sir.svg',
    hook: 'Eight commission types, one workflow.',
    facts: [
      'Replaced a manual, spreadsheet-driven commission audit process.',
      'A multi-stage, role-gated approval workflow, from initial audit through final approval.',
      'Batch toolbar actions let reviewers act on multiple records at once, across eight commission line types.',
      'React/TypeScript, MUI X Data Grid, Oracle APEX ORDS, Entra ID SSO.',
    ],
  },
  {
    id: 'credit-request',
    group: 'DHPace — Application Integration & Systems',
    icon: '/resume/icons/credit-request.svg',
    hook: 'Two ERPs, one credit and refund platform.',
    facts: [
      'A 3-phase, ~263-story-point initiative unifying two ERP systems’ credit/refund handling.',
      'Configurable, multi-stage, dollar-threshold-gated approval workflow.',
      'Automatic org-hierarchy-based approver assignment.',
      'SOAP integration with the ERP auto-populates invoice data.',
    ],
  },
  {
    id: 'vpp',
    group: 'DHPace — Application Integration & Systems',
    icon: '/resume/icons/vpp.svg',
    hook: 'Reverse-engineered an undocumented approval path — then proved it.',
    facts: [
      'Migrated off a legacy Nintex/SharePoint approval process.',
      'A data-driven, location-based approver-matching algorithm replaced hard-coded Nintex logic.',
      '25+ script SQL migration history, Playwright end-to-end test coverage.',
      'Passed a pre-deployment security audit with strong marks across security and code quality, "GO" recommendation.',
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
