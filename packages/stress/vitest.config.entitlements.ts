import { defineConfig, mergeConfig } from 'vitest/config'
import { rootConfig } from '../../vitest.config.mjs'

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            env: {},
            include: ['./src/**/*.test.ts'],
            hookTimeout: 120_000,
            testTimeout: 120_000,
            setupFiles: './vitest.setup.ts',
        },
    }),
)
