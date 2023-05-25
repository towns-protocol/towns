import sourcemaps from 'rollup-plugin-sourcemaps'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, UserConfigExport, PluginOption, UserConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'
import polyfillNode from 'rollup-plugin-polyfill-node'
import mkcert from 'vite-plugin-mkcert'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { vitePWAOptions } from './vite-pwa-options.config'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd(), '')

    const devPlugins: PluginOption[] = [
        checker({
            typescript: true,
            eslint: {
                lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
            },
        }) as PluginOption,
        visualizer({ filename: 'dist/stats.html', template: 'treemap' }) as PluginOption,
    ]
    const prodPlugins: PluginOption[] = []

    let config: UserConfig = {
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
            APP_COMMIT_HASH: JSON.stringify(commitHash),
        },
        assetsInclude: ['**/*.png', '**/*.svg'],
        plugins: [
            VitePWA(vitePWAOptions),
            polyfillNode(),
            react(),
            tsconfigPaths(),
            vanillaExtractPlugin(),
            sourcemaps({ exclude: '**/@sentry/**/*.js' }),
        ].concat(mode === 'development' ? devPlugins : prodPlugins) as PluginOption[],
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
