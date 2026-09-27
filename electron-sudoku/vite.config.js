import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Electron production builds are loaded from file://, so assets must be
  // relative to dist/index.html instead of rooted at the web origin.
  base: './',
  plugins: [react()],
  cacheDir: '.vite-cache',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
