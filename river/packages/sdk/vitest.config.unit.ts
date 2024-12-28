import { defineConfig, mergeConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'
import { rootConfig } from '../../vitest.config.mjs'

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            environment: 'happy-dom',
            include: ['./src/tests/unit/**/*.test.ts'],
            hookTimeout: 120_000,
            testTimeout: 120_000,
            setupFiles: './vitest.setup.ts',
            server: {
                deps: {
                    inline: ['@river-build/mls-rs-wasm'],
                },
            },
        },
        plugins: [wasm()],
    }),
)
