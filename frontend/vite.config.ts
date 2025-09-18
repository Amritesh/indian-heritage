import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or your framework plugin

export default defineConfig({
  plugins: [react()],
  base: '/indian-heritage/',        // <-- important for GitHub Pages
  build: {
    outDir: '../docs',              // <-- write to repo root /docs
    emptyOutDir: true
  }
})
