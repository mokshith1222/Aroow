import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { StorageService } from './services/StorageService'

// Initialize color mode before rendering to prevent flash
const storage = StorageService.getInstance();
document.documentElement.setAttribute('data-color-mode', storage.getColorMode());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
