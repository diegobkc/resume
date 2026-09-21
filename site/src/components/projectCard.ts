// site/src/components/projectCard.ts
import type { ProjectCard } from '../data/projects'
import { track } from '../lib/analytics'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

export function slugifyGroupName(name: string): string {
  return (
    'group-' +
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(COMBINING_DIACRITICS, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

const CARD_LINK_TOOLTIP_DEFAULT = 'Copy link to this project'
const CARD_LINK_TOOLTIP_COPIED = 'Link copied!'

function createCardLinkButton(anchorId: string, hook: string): HTMLButtonElement {
  const button = el('button', 'project-card-link-button')
  button.type = 'button'
  button.setAttribute('aria-label', `Copy link to “${hook}”`)
  button.title = CARD_LINK_TOOLTIP_DEFAULT

  const glyph = el('span')
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = '🔗'
  button.appendChild(glyph)

  button.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}#${anchorId}`
    const showCopiedFeedback = () => {
      track('card_link_copied')
      button.classList.add('project-card-link-button-copied')
      button.title = CARD_LINK_TOOLTIP_COPIED
      glyph.textContent = '✓'
      window.setTimeout(() => {
        button.classList.remove('project-card-link-button-copied')
        button.title = CARD_LINK_TOOLTIP_DEFAULT
        glyph.textContent = '🔗'
      }, 1500)
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(showCopiedFeedback).catch(() => {
        location.hash = anchorId
      })
    } else {
      location.hash = anchorId
    }
  })

  return button
}

export function renderProjectCard(project: ProjectCard): HTMLElement {
  const card = el('article', 'project-card')
  card.id = `project-${project.id}`

  const icon = document.createElement('img')
  icon.src = project.icon
  icon.alt = ''
  icon.className = 'project-card-icon'
  icon.width = 40
  icon.height = 40

  const hookRow = el('div', 'project-card-hook-row')
  const hook = el('h3', 'project-card-hook')
  hook.textContent = project.hook
  hookRow.append(hook, createCardLinkButton(card.id, project.hook))

  const list = el('ul', 'project-card-facts')
  for (const fact of project.facts) {
    const item = document.createElement('li')
    item.textContent = fact
    list.appendChild(item)
  }

  card.append(icon, hookRow, list)
  return card
}

export function renderProjectGroup(
  groupName: string,
  projects: ProjectCard[],
): HTMLElement {
  const section = el('section', 'project-group')
  section.id = slugifyGroupName(groupName)
  const heading = el('h2', 'fig-label')
  heading.textContent = groupName

  const grid = el('div', 'project-grid')
  for (const project of projects) {
    grid.appendChild(renderProjectCard(project))
  }

  section.append(heading, grid)
  return section
}
