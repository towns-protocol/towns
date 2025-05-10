import { mergeConfig, defineConfig } from 'vitest/config'
import { rootConfig } from '../../vitest.config.mjs'

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            env: {
                RIVER_ENV: 'local_multi',
                BOT_PORT: '5123',
                // unsure if we want this here or get from RIVER_ENV
                APP_REGISTRY_URL: 'https://localhost:5180',
            },
            include: ['./src/**/*.test.ts'],
            hookTimeout: 120_000,
            testTimeout: 120_000,
            setupFiles: './vitest.setup.ts',
        },
    }),
)
