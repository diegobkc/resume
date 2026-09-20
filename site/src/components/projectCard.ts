// site/src/components/projectCard.ts
import type { ProjectCard } from '../data/projects'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

export function renderProjectCard(project: ProjectCard): HTMLElement {
  const card = el('article', 'project-card')

  const icon = document.createElement('img')
  icon.src = project.icon
  icon.alt = ''
  icon.className = 'project-card-icon'
  icon.width = 40
  icon.height = 40

  const hook = el('h3', 'project-card-hook')
  hook.textContent = project.hook

  const list = el('ul', 'project-card-facts')
  for (const fact of project.facts) {
    const item = document.createElement('li')
    item.textContent = fact
    list.appendChild(item)
  }

  card.append(icon, hook, list)
  return card
}

export function renderProjectGroup(
  groupName: string,
  projects: ProjectCard[],
): HTMLElement {
  const section = el('section', 'project-group')
  const heading = el('h2', 'fig-label')
  heading.textContent = groupName

  const grid = el('div', 'project-grid')
  for (const project of projects) {
    grid.appendChild(renderProjectCard(project))
  }

  section.append(heading, grid)
  return section
}
