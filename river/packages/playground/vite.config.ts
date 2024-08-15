import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { default as checker } from 'vite-plugin-checker'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return defineConfig({
        define: {
            'process.env': env,
            'process.browser': true,
        },
        plugins: [
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
        },
    })
}
