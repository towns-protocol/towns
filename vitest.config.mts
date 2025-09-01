import path from 'path'
import os from 'os'
import { defineConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'

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
