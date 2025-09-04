import { defineConfig, mergeConfig } from 'vitest/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { rootConfig } from '../../vitest.config.mjs'

function readBypassSecret(): string | undefined {
    try {
        const contractsPath = resolve(__dirname, `../../core/run_files/local_dev/contracts.env`)
        const content = readFileSync(contractsPath, 'utf8')
        const line = content
            .split(/\r?\n/)
            .find((l) => l.startsWith('RIVER_TESTENTITLEMENTSBYPASSSECRET='))
        if (line) {
            return line.split('=', 2)[1]
        }
    } catch {}
    return undefined
}

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            environment: 'happy-dom',
            name: 'multi_ne',
            env: {
                RIVER_ENV: 'local_dev',
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
