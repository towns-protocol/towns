import path from 'path'
import os from 'os'
import { defineConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config({
    path: resolve(__dirname, 'packages/generated/deployments/local_dev/.env'),
    quiet: true,
})

export function readBypassSecret(): string | undefined {
    try {
        const runEnv = process.env.RIVER_ENV || 'local_dev'
        const contractsPath = resolve(__dirname, `./core/run_files/${runEnv}/contracts.env`)
        const content = readFileSync(contractsPath, 'utf8')
        const line = content
            .split(/\r?\n/)
            .find((l) => l.startsWith('RIVER_TESTENTITLEMENTSBYPASSSECRET='))
        if (line) return line.split('=', 2)[1]
    } catch {}
    return undefined
}

export const rootConfig = defineConfig({
    test: {
        environment: 'node',
        coverage: {
            all: false,
            reporter: process.env.CI ? ['lcov'] : ['text', 'json', 'html'],
            exclude: ['**/dist/**', '**/*.test.ts', '**/*.test-d.ts'],
        },
        globals: true,
        env: {
            NODE_EXTRA_CA_CERTS: path.join(os.homedir(), 'river-ca-cert.pem'),
            NODE_TLS_REJECT_UNAUTHORIZED: '0',
        },
        testTimeout: 20_000,
    },
    plugins: [wasm()],
})

export default rootConfig
