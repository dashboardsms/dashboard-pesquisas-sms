import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // O plugin da Cloudflare empacota o Worker (worker/) junto com o frontend.
  plugins: [react(), tailwindcss(), cloudflare()],
})
