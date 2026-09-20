// site/src/main.ts
import { createChatWidget } from './components/chatWidget'
import { createDuckViewer } from './components/duckViewer'
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
  sidePanel.append(createDuckViewer(), createChatWidget())

  const contentColumn = el('div', 'content-column')
  contentColumn.appendChild(buildHero())

  for (const [groupName, projects] of groupProjects()) {
    contentColumn.appendChild(renderProjectGroup(groupName, projects))
  }

  layout.append(sidePanel, contentColumn)
  app.appendChild(layout)
}
