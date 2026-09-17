import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required for Capacitor: all asset paths must be relative
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
