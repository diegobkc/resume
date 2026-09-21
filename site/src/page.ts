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
  tagline.textContent = 'Engineering Manager · AI-Augmented Enterprise Delivery'

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
