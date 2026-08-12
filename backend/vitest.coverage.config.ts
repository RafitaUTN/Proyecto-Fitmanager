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
        'src/exercises/{media-url-validation,wger-media.provider}.ts',
        'src/services/{auth,cliente-auth,password-recovery,cliente-membresia,transferencia,rutina,asistencia,notificacion,notification-factory,exercise-media}.service.ts',
      ],
      // Cobertura real (unit tests, 2026-08-09): 97.9% stmts / 89.3% branches.
      // Umbrales con margen para no ser frágiles; subir gradualmente si el
      // código sigue estable.
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 92 },
    },
  },
})
