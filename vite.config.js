import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Allow tunnel hostnames (cloudflared / ngrok) to reach the dev server.
    // Tunnels give a real HTTPS cert, which phone previewers accept (unlike a
    // self-signed LAN cert) and which gives MSAL the secure context it needs.
    allowedHosts: true,
  },
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
