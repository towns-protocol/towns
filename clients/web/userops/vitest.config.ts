// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ['./vitest.setup.ts', 'dotenv/config'],
        testTimeout: 60000,
    },
})
