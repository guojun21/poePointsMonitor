import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 58233,
    strictPort: true
  },
  build: {
    outDir: 'dist'
  }
})
