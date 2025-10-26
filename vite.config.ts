// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // Read env (so we can pass VITE_BASE only for prod deploy)
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE && env.VITE_BASE.trim() !== '' ? env.VITE_BASE : '/'

  return {
    base, // '/' in dev; '/<REPO>/' when you set VITE_BASE for deploy
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
