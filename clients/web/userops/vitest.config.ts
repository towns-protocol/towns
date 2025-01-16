// vitest.config.ts
import { defineConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
    test: {
        restoreMocks: true,
        globals: true,
        setupFiles: ['./vitest.setup.ts', 'dotenv/config', '@vitest/web-worker'],
        testTimeout: 180_000,
        environment: 'jsdom',
        poolOptions: {
            threads: {
                // run single test at a time - alchemy rpc rate limits (test account), avoid multiple concurrent useroperations from same user (privy runs)
                singleThread: true,
            },
        },
        server: {
            deps: {
                inline: ['@river-build/mls-rs-wasm'],
            },
        },
    },
    plugins: [wasm()],
})
