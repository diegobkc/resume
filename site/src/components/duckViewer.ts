import '@google/model-viewer'

const DUCK_MODEL_SRC = '/resume/duck.glb'
const DUCK_POSTER_SRC = '/resume/duck-poster.png'

export function createDuckViewer(): HTMLElement {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (prefersReducedMotion) {
    const img = document.createElement('img')
    img.src = DUCK_POSTER_SRC
    img.alt = 'A stylized 3D duck mascot, standing'
    img.className = 'duck-viewer duck-viewer-static'
    img.width = 220
    img.height = 220
    return img
  }

  const viewer = document.createElement('model-viewer')
  viewer.setAttribute('src', DUCK_MODEL_SRC)
  viewer.setAttribute('poster', DUCK_POSTER_SRC)
  viewer.setAttribute('alt', 'A stylized 3D duck mascot, standing — drag to rotate')
  viewer.setAttribute('camera-controls', '')
  viewer.setAttribute('disable-zoom', '')
  viewer.setAttribute('loading', 'lazy')
  viewer.className = 'duck-viewer'
  return viewer
}
