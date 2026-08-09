import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/components/ProtectedRoute.tsx', 'src/lib/{api,jwt}.ts', 'src/store/auth.store.ts'],
      thresholds: { statements: 70, branches: 60, functions: 70, lines: 70 },
    },
  },
})
