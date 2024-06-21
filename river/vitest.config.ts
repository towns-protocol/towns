import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            all: false,
            reporter: process.env.CI ? ['lcov'] : ['text', 'json', 'html'],
            exclude: ['**/dist/**', '**/*.test.ts', '**/*.test-d.ts'],
        },
        globals: true,
    },
})
