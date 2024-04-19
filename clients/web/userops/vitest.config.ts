// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ['./vitest.setup.ts', 'dotenv/config'],
        testTimeout: 180_000,
        poolOptions: {
            threads: {
                // run single test at a time - alchemy rpc rate limits (test account), avoid multiple concurrent useroperations from same user (privy runs)
                singleThread: true,
            },
        },
    },
})
