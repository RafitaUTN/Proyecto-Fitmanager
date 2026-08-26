/**
 * Punto de entrada frontend main.
 *
 * @remarks Inicializa la aplicación React y conecta proveedores globales necesarios.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { EventBridge } from './components/EventBridge'
import { queryClient } from './lib/query-client'
import './index.css'

if (import.meta.env.VITE_MOBILE_START_PATH?.trim()) {
  document.documentElement.dataset.fitmanagerShell = 'mobile'
}

if (import.meta.env.VITE_DISABLE_PWA_SW !== 'true') {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <EventBridge />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
