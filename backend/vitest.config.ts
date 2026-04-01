import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use globals for cleaner test syntax
    globals: true,

    // Node environment for backend testing
    environment: 'node',

    // Setup file for global test configuration
    setupFiles: ['./test/setup.ts'],

    // Test file patterns
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/server.ts',
      ],
      // Set coverage thresholds
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },

    // Timeouts (in milliseconds)
    testTimeout: 10000,
    hookTimeout: 10000,

    // Output configuration
    reporters: ['default', 'json'],
    outputFile: './test-results/test-results.json',

    // Isolate tests for consistent behavior
    isolate: true,

    // Pooling configuration
    pool: 'threads',
    singleThread: false,
    minThreads: 1,
    maxThreads: 4,

    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Verbose output for better debugging
    verbose: true,
    bail: 1, // Stop on first failure in CI
  },
  resolve: {
    // Allow importing from workspace packages
    alias: {
      '@story-game/shared': '../packages/shared/src',
    },
  },
})
