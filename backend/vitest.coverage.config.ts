import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'test/integration/**/*.integration.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: [
        'src/middlewares/auth.middleware.ts',
        'src/repositories/rutina.repository.ts',
        'src/services/{auth,cliente-auth,password-recovery,cliente-membresia,transferencia,rutina,asistencia,notificacion,notification-factory}.service.ts',
      ],
      // Baseline honesto sobre módulos críticos; CI impide regresiones y debe
      // elevarse gradualmente. Auth ya supera 89% statements / 85% branches.
      thresholds: { statements: 38, branches: 27, functions: 30, lines: 41 },
    },
  },
})
