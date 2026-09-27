import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Keeping generated cache outside node_modules also behaves better once
  // this renderer is hosted inside an Electron development workflow.
  cacheDir: '.vite-cache',
})
