import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTextScale } from './utils/textScale'
import { TEXT_SCALE_KEY } from './game/config'

try {
  applyTextScale(Number(localStorage.getItem(TEXT_SCALE_KEY)) || 1)
} catch {
  /* storage unavailable */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
