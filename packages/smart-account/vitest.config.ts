import { defineConfig, mergeConfig } from 'vitest/config'
import { rootConfig } from '../../vitest.config.mts'

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            globals: true,
            testTimeout: 60_000,
        },
    }),
)
