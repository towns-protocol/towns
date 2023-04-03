import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
//import eslintPlugin from 'vite-plugin-eslint'
import { visualizer } from 'rollup-plugin-visualizer'
import polyfillNode from 'rollup-plugin-polyfill-node'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    root: 'src',
    build: {
        outDir: path.resolve(__dirname, 'dist'),
    },
    // resolve: {
    //     alias: {
    //         'package-b': path.resolve(__dirname, 'packages/package-b/src'),
    //     },
    // },
    plugins: [
        polyfillNode(),
        react(),
        tsconfigPaths(),
        checker({ typescript: true }),
        //eslintPlugin(),
        vanillaExtractPlugin(),
        visualizer({ filename: 'dist/stats.html' }),
    ],
    server: {
        port: 3002,
        hmr: {
            overlay: false,
        },
        open: false,
    },
})
