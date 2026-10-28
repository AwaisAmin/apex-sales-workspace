import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // MSW's cookie emulation drags in a ~255 kB public-suffix list; this app's mock API uses no
      // cookies, so an empty jar is equivalent. See src/mocks/tough-cookie-stub.ts.
      'tough-cookie': fileURLToPath(new URL('./src/mocks/tough-cookie-stub.ts', import.meta.url)),
    },
  },
})
