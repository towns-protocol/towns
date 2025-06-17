import { mergeConfig, defineConfig } from 'vitest/config'
import { rootConfig } from '../../vitest.config.mjs'

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            env: {
                BOT_PORT: '5123',
                RIVER_ENV: 'local_multi', // hardcoded for now -- will investigate later
                APP_REGISTRY_LOCAL_MULTI_URL: 'https://localhost:6170',
                APP_REGISTRY_LOCAL_MULTI_NE_URL: 'https://localhost:6190',
            },
            include: ['./src/**/*.test.ts'],
            hookTimeout: 120_000,
            testTimeout: 120_000,
            setupFiles: './vitest.setup.ts',
        },
    }),
)
