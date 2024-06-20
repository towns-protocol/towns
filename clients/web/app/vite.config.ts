import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, PluginOption, UserConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import mkcert from 'vite-plugin-mkcert'
import { VitePWA } from 'vite-plugin-pwa'
import { vitePWAOptions } from './vite-pwa-options.config'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

const isProduction = process.env.NODE_ENV === 'production'

// Turning off in production because of HNT-4418
const profiling =
    isProduction && false
        ? {
              'react-dom/client': 'react-dom/profiling',
          }
        : ({} as Record<string, string>)

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    console.log('viteconfig:mode', mode)
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
                        if (id.includes('lodash')) {
                            return 'lodash'
                        }
                    },
                },
            },
            minify: false, // Ensure esbuild is used for minification
        },
        define: {
            APP_VERSION: JSON.stringify(process.env.npm_package_version),
            APP_COMMIT_HASH: JSON.stringify(commitHash),
            // userops mode is used for loading env.userops.local
            ...(mode === 'development' || mode === 'userops'
                ? {
                      'process.env': {
                          NODE_ENV: JSON.stringify(mode),
                      },
                  }
                : {}),
        },
        assetsInclude: ['**/*.png', '**/*.svg', '**/*.wasm'],
        plugins: [
            VitePWA(vitePWAOptions(mode, env)),
            nodePolyfills(),
            react(),
            tsconfigPaths(),
            vanillaExtractPlugin(),
            // visualizer({ filename: 'dist/stats.html', template: 'treemap' }) as PluginOption,
        ].concat(mode === 'development' ? devPlugins : prodPlugins) as PluginOption[],
        server: {
            host: env.VITE_LOCAL_HOSTNAME,
            port: 3000,
            hmr: {
                overlay: false,
            },
        },
        resolve: {
            alias: {
                ...profiling,
            },
        },
    }

    if (env.VITE_USE_LOCAL_NETWORK_HTTPS === 'true') {
        console.log('Using local network HTTPS')
        config.server!.host = '0.0.0.0'
        config.server!.https = {}
        config.plugins!.push(mkcert({ hosts: [env.VITE_LOCAL_HOSTNAME] }))
    }

    return defineConfig(config)
}
