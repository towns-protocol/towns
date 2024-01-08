import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, PluginOption, UserConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'
import polyfillNode from 'rollup-plugin-polyfill-node'
import mkcert from 'vite-plugin-mkcert'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { vitePWAOptions } from './vite-pwa-options.config'
import { execSync } from 'child_process'
import basicSsl from '@vitejs/plugin-basic-ssl'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

const isProduction = process.env.NODE_ENV === 'production'

// Turning off in production because of HNT-4418
const profiling =
    isProduction && false
        ? {
              'react-dom/client': 'react-dom/profiling',
          }
        : ({} as Record<string, string>)

function differMatrixSourcemapsPlugins(): PluginOption {
    const matrixPackages = ['node_modules/matrix', 'node_modules/@matrix-org']

    return {
        name: 'differ-matrix-sourcemap',
        transform(code: string, id: string) {
            if (matrixPackages.some((pkg) => id.includes(pkg))) {
                return {
                    code: code,
                    map: { mappings: '' },
                }
            }
        },
    }
}

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    console.log('viteconfig:mode', mode)
    const env = loadEnv(mode, process.cwd(), '')

    const devPlugins: PluginOption[] = [
        ...[env.VITE_USE_LOCAL_NETWORK_HTTPS ? basicSsl() : []],
        checker({
            typescript: true,
            eslint: {
                lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
            },
        }) as PluginOption,
        visualizer({ filename: 'dist/stats.html', template: 'treemap' }) as PluginOption,
    ]
    const prodPlugins: PluginOption[] = [differMatrixSourcemapsPlugins()]

    let config: UserConfig = {
        optimizeDeps: {
            esbuildOptions: {
                define: {
                    global: 'globalThis',
                },
                target: 'esnext',
            },
        },
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
                        } else if (id.includes('matrix-sdk-crypto')) {
                            return 'matrix-sdk-crypto'
                        } else if (id.includes('matrix-js-sdk')) {
                            return 'matrix-js-sdk'
                        }
                    },
                },
            },
            minify: false, // Ensure esbuild is used for minification
        },
        define: {
            APP_VERSION: JSON.stringify(process.env.npm_package_version),
            APP_COMMIT_HASH: JSON.stringify(commitHash),
            ...(mode === 'development'
                ? {
                      'process.env': {
                          NODE_ENV: JSON.stringify(mode),
                      },
                  }
                : {}),
        },
        assetsInclude: ['**/*.png', '**/*.svg'],
        plugins: [
            VitePWA(vitePWAOptions(mode, env)),
            polyfillNode(),
            react(),
            tsconfigPaths(),
            vanillaExtractPlugin(),
        ].concat(mode === 'development' ? devPlugins : prodPlugins) as PluginOption[],
        server: {
            host: env.VITE_LOCAL_HOSTNAME,
            port: 3000,
            hmr: {
                overlay: false,
            },
            proxy: env.VITE_CASABLANCA_HOMESERVER_DEV_PROXY_PATH
                ? {
                      [`/${env.VITE_CASABLANCA_HOMESERVER_DEV_PROXY_PATH}`]: {
                          target: env.VITE_CASABLANCA_HOMESERVER_URL,
                          changeOrigin: true,
                          rewrite: (path) =>
                              path.replace(
                                  new RegExp(
                                      `^\/${env.VITE_CASABLANCA_HOMESERVER_DEV_PROXY_PATH}/`,
                                  ),
                                  '',
                              ),
                      },
                  }
                : undefined,
        },
        resolve: {
            alias: {
                ...profiling,
            },
        },
    }

    return defineConfig(config)
}
