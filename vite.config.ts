import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

function pagesBase(): string {
  if (process.env.BASE_PATH) {
    const value = process.env.BASE_PATH
    return value.endsWith('/') ? value : `${value}/`
  }
  if (process.env.GITHUB_PAGES === 'true' && process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1]
    return `/${repo}/`
  }
  return '/'
}

function spaFallback() {
  return {
    name: 'spa-github-pages-fallback',
    closeBundle() {
      const index = path.resolve(dirname, 'dist/index.html')
      const fallback = path.resolve(dirname, 'dist/404.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, fallback)
      }
    },
  }
}

export default defineConfig({
  base: pagesBase(),
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
