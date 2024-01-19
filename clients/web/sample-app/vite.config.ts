import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import eslintPlugin from 'vite-plugin-eslint'
import { visualizer } from 'rollup-plugin-visualizer'
import polyfillNode from 'rollup-plugin-polyfill-node'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        target: 'esnext',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    // This works around a circular dependency issue with the @wagmi package
                    if (id.includes('@wagmi')) {
                        return 'wagmi'
                    } else if (id.includes('lodash')) {
                        return 'lodash'
                    }
                },
                sourcemapIgnoreList: (relativeSourcePath) => {
                    // avoid spending memory and cpu cycles on source-mapping node_modules
                    const normalizedPath = path.normalize(relativeSourcePath)
                    return normalizedPath.includes('node_modules')
                },
            },
        },
    },
    define: {
        APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    assetsInclude: ['**/*.png', '**/*.svg'],
    plugins: [
        polyfillNode(),
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
