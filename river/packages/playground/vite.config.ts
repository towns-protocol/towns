import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { default as checker } from 'vite-plugin-checker'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        checker({
            typescript: true,
            eslint: {
                lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
            },
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
    },
})
