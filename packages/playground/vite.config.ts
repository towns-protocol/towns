import react from '@vitejs/plugin-react-swc'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import oxlint from 'vite-plugin-oxlint'
import tsconfigPaths from 'vite-tsconfig-paths'
import wasm from 'vite-plugin-wasm'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

// The encryption WASM module is imported dynamically.
// Since it's common for developers to use a linked copy of @towns-protocol/vodozemac (which could reside anywhere on their file system),
// Vite needs to be told to recognize it as a legitimate file access.
const allow = [searchForWorkspaceRoot(process.cwd()), 'node_modules/@towns-protocol/olm']

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    return defineConfig({
        define: {
            'process.browser': true,
        },
        plugins: [
            nodePolyfills(),
            wasm(),
            tsconfigPaths(),
            oxlint({
                path: 'src',
            }),
            react(),
        ],
        resolve: {
            alias: [
                {
                    find: '@',
                    replacement: path.resolve(__dirname, './src'),
                },
                {
                    find: /^(vite-plugin-node-polyfills\/shims\/.+)/,
                    replacement: '$1',
                    customResolver(source) {
                        return import.meta.resolve(source).replace(/^file:\/\//, '')
                    },
                },
            ],
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
