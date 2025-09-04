import { defineConfig, mergeConfig } from 'vitest/config'
import { rootConfig, readBypassSecret } from '../../vitest.config.mjs'

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            environment: 'happy-dom',
            name: 'multi_ne',
            env: {
                RIVER_ENV: 'local_dev',
                // skip entitlements for these tests
                RIVER_TEST_ENT_BYPASS_SECRET: readBypassSecret() ?? '',
            },
            include: ['./src/tests/multi_ne/**/*.test.ts'],
            hookTimeout: 120_000,
            testTimeout: 120_000,
            setupFiles: './vitest.setup.ts',
        },
        resolve: {
            conditions: ['browser'],
            alias: {
                '@connectrpc/connect-node': '@connectrpc/connect-web',
            },
        },
    }),
)
