import sourcemaps from 'rollup-plugin-sourcemaps'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, UserConfigExport } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'
import polyfillNode from 'rollup-plugin-polyfill-node'
import mkcert from 'vite-plugin-mkcert'
import path from 'path'

// https://vitejs.dev/config/
export default ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    const devPlugins = [
        checker({
            typescript: true,
            eslint: {
                lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
            },
        }),
        visualizer({ filename: 'dist/stats.html', template: 'treemap' }),
    ]
    const prodPlugins = []

    let config: UserConfigExport = {
        build: {
            target: 'esnext',
            sourcemap: true,
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        if (id.includes('lodash')) {
                            return 'lodash'
                        } else if (id.includes('matrix-sdk-crypto')) {
                            return 'matrix-sdk-crypto'
                        } else if (id.includes('matrix')) {
                            return 'matrix-rest'
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
            vanillaExtractPlugin(),
            ,
            sourcemaps({ exclude: '**/@sentry/**/*.js' }),
        ].concat(mode === 'development' ? devPlugins : prodPlugins),
        server: {
            port: 3000,
            hmr: {
                overlay: false,
            },
        },
    }

    if (env.VITE_USE_LOCAL_NETWORK_HTTPS === 'true') {
        console.log('Using local network HTTPS')
        config.server!.host = '0.0.0.0'
        config.server!.https = true
        config.plugins!.push(mkcert({ hosts: [env.VITE_LOCAL_HOSTNAME] }))
    }

    return defineConfig(config)
}
