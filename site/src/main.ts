// site/src/main.ts
import { createChatWidget } from './components/chatWidget'
import { createDuckViewer } from './components/duckViewer'
import { el } from './lib/dom'
import { buildContentColumn } from './page'
import { track } from './lib/analytics'

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  track('page_view')

  const layout = el('div', 'page-layout')

  const sidePanel = el('div', 'side-panel')
  sidePanel.append(createDuckViewer(), createChatWidget())

  layout.append(sidePanel, buildContentColumn())

  app.replaceChildren(layout)
}
