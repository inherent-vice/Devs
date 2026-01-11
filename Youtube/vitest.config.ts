import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global setup
    globals: true,

    // Include patterns
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', 'apps'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules',
        'dist',
        'apps',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/index.ts',
      ],
    },

    // Test timeout
    testTimeout: 30000,

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      GOOGLE_AI_API_KEY: 'test-api-key',
    },

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Reporter configuration
    reporters: ['verbose'],

    // Retry failed tests
    retry: 0,
  },

  // Resolve configuration for TypeScript
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
