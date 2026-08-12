import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { validatePublicApiUrl } from './src/config/api-url-policy.js'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const fileEnv = loadEnv(mode, __dirname, '')
    validatePublicApiUrl(process.env.VITE_API_URL || fileEnv.VITE_API_URL, mode === 'production')
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
