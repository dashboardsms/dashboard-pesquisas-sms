import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// No GitHub Pages vai só o frontend, numa subpasta (BASE_PATH, ex.: /dashboard-pesquisas-sms).
// A API continua no Worker da Cloudflare, cujo endereço entra no build por VITE_API_URL.
const githubPages = process.env.GITHUB_PAGES === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: githubPages ? `${process.env.BASE_PATH ?? ''}/` : '/',
  // O plugin da Cloudflare empacota o Worker (worker/) junto com o frontend.
  plugins: [react(), tailwindcss(), ...(githubPages ? [] : [cloudflare()])],
})
