import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@story-game/shared': path.resolve(__dirname, '../packages/shared/src'),
    },
  },

  test: {
    // Use globals for cleaner test syntax
    globals: true,

    // DOM environment for frontend testing
    environment: 'jsdom',

    // Setup file for global test configuration
    setupFiles: ['./src/test/setup.ts'],

    // Test file patterns
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        'src/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
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
    bail: false, // Run all tests even if some fail
  },
})
