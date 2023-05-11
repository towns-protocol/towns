import sourcemaps from 'rollup-plugin-sourcemaps'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, UserConfigExport } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import eslintPlugin from 'vite-plugin-eslint'
import { visualizer } from 'rollup-plugin-visualizer'
import polyfillNode from 'rollup-plugin-polyfill-node'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    let config: UserConfigExport = {
        build: {
            target: 'esnext',
            sourcemap: true,
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        // This works around a circular dependency issue with the @wagmi package
                        if (id.includes('@wagmi')) {
                            return 'wagmi'
                            // Lodash is used in many chunks, split it into one bundle
                        } else if (id.includes('lodash')) {
                            return 'lodash'
                        } else if (id.includes('matrix-sdk-crypto')) {
                            return 'matrix-sdk-crypto'
                        } else if (id.includes('matrix')) {
                            return 'matrix-rest'
                        }
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
            visualizer({ filename: 'dist/stats.html', template: 'treemap' }),
            sourcemaps({ exclude: '**/@sentry/**/*.js' }),
        ],
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
