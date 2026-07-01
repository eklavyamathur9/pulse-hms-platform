import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initFrontendOtel } from './lib/otel'
import App from './App'

initFrontendOtel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
