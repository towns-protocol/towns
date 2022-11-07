import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import eslintPlugin from 'vite-plugin-eslint'
import { visualizer } from 'rollup-plugin-visualizer'
import polyfillNode from 'rollup-plugin-polyfill-node'

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6', // add buffer
            process: 'rollup-plugin-node-polyfills/polyfills/process-es6', // add process
        },
    },
    plugins: [
        polyfillNode({ sourceMap: true, buffer: true } as any),
        react(),
        tsconfigPaths(),
        checker({ typescript: true }),
        eslintPlugin(),
        vanillaExtractPlugin(),
        visualizer({ filename: 'dist/stats.html' }),
    ],
    server: {
        port: 3001,
        hmr: {
            overlay: false,
        },
    },
})
