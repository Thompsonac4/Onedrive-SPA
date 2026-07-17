import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle so opening /auth.html does NOT trigger "optimized dependencies
    // changed. reloading" in the middle of the login BroadcastChannel handshake.
    include: [
      '@azure/msal-browser',
      '@azure/msal-browser/redirect-bridge',
      '@azure/msal-react',
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, 'auth.html'),
      },
    },
  },
})
