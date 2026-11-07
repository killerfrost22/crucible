import '@fontsource-variable/schibsted-grotesk/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { whenFontsReady } from './lib/fonts'
import './styles/tokens.css'
import './styles/base.css'
import './styles/landing.css'
import './styles/board.css'
import './styles/cards.css'
import './styles/verdict.css'

// Hold the first paint until the faces are ready (capped), so text never reflows.
const root = document.documentElement
root.classList.add('fonts-pending')
void whenFontsReady().then(() => root.classList.remove('fonts-pending'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
