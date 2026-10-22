// Text size from Settings: scales the whole interface (see #root in app.css).
export function applyTextScale(scale) {
  document.documentElement.style.setProperty('--ui-scale', String(scale || 1))
}
