import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // A unique build identifier makes browsers fetch a fresh service worker for
    // every deployment, even when the worker source itself is unchanged.
    __VAULTED_BUILD_ID__: JSON.stringify(Date.now().toString()),
  },
})
