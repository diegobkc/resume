function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  return node
}

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  const label = el('div', 'FIG. 01 — RESUME.SYSTEM')
  label.className = 'fig-label'

  const heading = el('h1', 'Brian Jones')
  const tagline = el(
    'p',
    'Senior Full-Stack & AI Automation Engineer · Engineering Manager',
  )

  const classicLink = el('a', 'View the traditional resume →')
  classicLink.href = '/resume/classic/'
  const classicPara = el('p')
  classicPara.appendChild(classicLink)

  app.append(label, heading, tagline, classicPara)
}
