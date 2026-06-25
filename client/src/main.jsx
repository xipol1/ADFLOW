import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../styles/globals.css'

// ── WebMCP origin trial (navegación agéntica) ────────────────────────────────
// navigator.modelContext (la API que usan las tools WebMCP de ui/lib/webmcp.js)
// está detrás de una PRUEBA DE ORIGEN de Chrome: no existe en el navegador hasta
// que el dominio se inscribe en https://developer.chrome.com/origintrials y la
// página presenta un token válido. Si el token está configurado en la variable
// de entorno VITE_WEBMCP_ORIGIN_TRIAL_TOKEN, lo inyectamos en <head> ANTES de
// renderizar, para que la API esté habilitada cuando registerCalculatorTools()
// corra al montar App. Sin token, esto es un no-op (comportamiento actual).
const OT_TOKEN = import.meta.env.VITE_WEBMCP_ORIGIN_TRIAL_TOKEN
if (OT_TOKEN && typeof document !== 'undefined') {
  const meta = document.createElement('meta')
  meta.httpEquiv = 'origin-trial'
  meta.content = OT_TOKEN
  document.head.appendChild(meta)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
