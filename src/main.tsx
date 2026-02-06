import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App.tsx'
import './index.css'

// Registra Service Worker e força atualização quando houver nova versão (limpa cache antigo)
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
