const DUCK_MODEL_SRC = '/resume/duck.glb'
const DUCK_POSTER_SRC = '/resume/duck-poster.png'
const DUCK_INTERACTIVE_ALT = 'A stylized 3D duck mascot, standing — drag to rotate'
const DUCK_STATIC_ALT = 'A stylized 3D duck mascot, standing'

function createPosterImage(alt: string): HTMLImageElement {
  const img = document.createElement('img')
  img.src = DUCK_POSTER_SRC
  img.alt = alt
  img.className = 'duck-viewer duck-viewer-static'
  img.width = 220
  img.height = 220
  return img
}

// The static poster image is the LCP candidate: it paints immediately with
// no JS dependency. `@google/model-viewer` bundles a stripped three.js and
// is by far the largest chunk on this page, so it's fetched only after the
// browser is idle, then swapped in for the poster — per spec, "the duck
// model lazy-loads after main content paint."
function upgradeToInteractiveViewer(container: HTMLElement): void {
  const load = async () => {
    await import('@google/model-viewer')
    const viewer = document.createElement('model-viewer')
    viewer.setAttribute('src', DUCK_MODEL_SRC)
    viewer.setAttribute('poster', DUCK_POSTER_SRC)
    viewer.setAttribute('alt', DUCK_INTERACTIVE_ALT)
    viewer.setAttribute('camera-controls', '')
    viewer.setAttribute('disable-zoom', '')
    viewer.className = 'duck-viewer'
    container.replaceChildren(viewer)
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => void load())
  } else {
    window.setTimeout(() => void load(), 200)
  }
}

export function createDuckViewer(): HTMLElement {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (prefersReducedMotion) {
    return createPosterImage(DUCK_STATIC_ALT)
  }

  const container = document.createElement('div')
  container.className = 'duck-viewer-container'
  container.appendChild(createPosterImage(DUCK_INTERACTIVE_ALT))
  upgradeToInteractiveViewer(container)
  return container
}
