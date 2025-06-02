import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite'
import { default as checker } from 'vite-plugin-checker'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { replaceCodePlugin } from 'vite-plugin-replace'
import tsconfigPaths from 'vite-tsconfig-paths'
import wasm from 'vite-plugin-wasm'
import path from 'path'

// The encryption WASM module is imported dynamically.
// Since it's common for developers to use a linked copy of @towns-protocol/vodozemac (which could reside anywhere on their file system),
// Vite needs to be told to recognize it as a legitimate file access.
const allow = [searchForWorkspaceRoot(process.cwd()), 'node_modules/@towns-protocol/olm']

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return defineConfig({
        define: {
            'process.env': env,
            'process.browser': true,
        },
        plugins: [
            wasm(),
            tsconfigPaths(),
            replaceCodePlugin({
                replacements: [
                    {
                        from: `if ((crypto && crypto.getRandomValues) || !process.browser) {
  exports.randomFill = randomFill
  exports.randomFillSync = randomFillSync
} else {
  exports.randomFill = oldBrowser
  exports.randomFillSync = oldBrowser
}`,
                        to: `exports.randomFill = randomFill
exports.randomFillSync = randomFillSync`,
                    },
                ],
            }),
            checker({
                typescript: true,
                eslint: {
                    lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
                },
            }),
            nodePolyfills(),
            react(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 3100,
            fs: {
                allow,
            },
        },
        build: {
            target: 'esnext',
        },
        optimizeDeps: {
            exclude: ['@towns-protocol/olm'],
        },
    })
}
