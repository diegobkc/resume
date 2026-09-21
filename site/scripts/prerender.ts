// site/scripts/prerender.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { el } from '../src/lib/dom'
import { buildContentColumn } from '../src/page'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.document = dom.window.document

const layout = el('div', 'page-layout')
const sidePanel = el('div', 'side-panel')
layout.append(sidePanel, buildContentColumn())

const __dirname = dirname(fileURLToPath(import.meta.url))
const distIndexPath = resolve(__dirname, '../dist/index.html')
const html = readFileSync(distIndexPath, 'utf8')

const appMarker = '<div id="app"></div>'
if (!html.includes(appMarker)) {
  throw new Error(`prerender: expected to find ${appMarker} in ${distIndexPath}`)
}

const updated = html.replace(appMarker, `<div id="app">${layout.outerHTML}</div>`)
writeFileSync(distIndexPath, updated, 'utf8')
console.log('prerender: injected content into dist/index.html')
