import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { StorageService } from './services/StorageService'

async function initApp() {
  const storage = StorageService.getInstance();
  
  const restored = await storage.initializeAndRestoreIfNeeded();
  if (restored) {
    (window as any).__AROOW_RESTORED = true;
  }

  // Initialize color mode before rendering to prevent flash
  document.documentElement.setAttribute('data-color-mode', storage.getColorMode());

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

initApp();
