import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
    },
  },
  test: {
    environment: 'happy-dom',
    environmentMatchGlobs: [['electron/**', 'node']],
    setupFiles: ['./test/setup.renderer.ts', './test/setup.main.ts'],
    globals: false,
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'dist-electron', '.idea', '.git', '.cache', 'website/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'dist-electron/',
        'website/**',
        'test/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/mockData',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    threads: true,
    maxThreads: 4,
    mockReset: true,
    restoreMocks: true,
  },
})
