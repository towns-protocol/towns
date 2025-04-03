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
import path from 'path'
import wasm from 'vite-plugin-wasm'

const commitHash = process.env.RENDER_GIT_COMMIT
    ? String(process.env.RENDER_GIT_COMMIT).substring(0, 7)
    : execSync('git rev-parse --short HEAD').toString().trim()

const isProduction = process.env.NODE_ENV === 'production'
const enableMSWBrowser = process.env.VITE_ENABLE_MSW_BROWSER === 'true'

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
            overlay: env.DEV_DISABLE_ERROR_OVERLAY === 'true' ? false : true,
            eslint: {
                lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
            },
        }) as PluginOption,
        visualizer({ filename: 'dist/stats.html', template: 'treemap' }) as PluginOption,
    ]
    const prodPlugins: PluginOption[] = []

    let config: UserConfig = {
        optimizeDeps: {
            include: [],
            esbuildOptions: {
                define: {
                    global: 'globalThis',
                },
                target: 'esnext',
            },
            exclude: ['@connectrpc/connect-node'],
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
        },
        define: {
            VITE_APP_VERSION: JSON.stringify(process.env.npm_package_version),
            VITE_APP_COMMIT_HASH: JSON.stringify(commitHash),
            VITE_APP_TIMESTAMP: JSON.stringify(Date.now()),
            VITE_APP_MODE: JSON.stringify(process.env.MODE ?? ''),
            ...(mode === 'development'
                ? {
                      'process.env': {
                          NODE_ENV: JSON.stringify(mode),
                      },
                  }
                : {}),
        },
        assetsInclude: ['**/*.png', '**/*.svg', '**/*.wasm'],
        plugins: [
            wasm(),
            // these workers conflict with each other
            ...(enableMSWBrowser ? [] : [VitePWA(vitePWAOptions(mode, env))]),
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
                ...plateImports,
            },
        },
        worker: {
            format: 'es',
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

/**
 * Aliases for PlateJS v39.x packages. See discussion
 *
 * @see https://app.towns.com/t/0xc87bb04477151743070b45a3426938128896ac5d/channels/20c87bb04477151743070b45a3426938128896ac5d53732cf2c04b870fc0aa8a#1a1c6ef921fb17df0731115d861c27e3aa7d140696605673cecfc2d871ed9646
 * @see https://github.com/HereNotThere/harmony/pull/8281
 *
 */
export const plateImports = {
    // Handle both base and /react suffixed imports
    '@udecode/plate-common/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-common/dist/react',
    ),
    '@udecode/plate-core/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-core/dist/react',
    ),
    '@udecode/plate-list/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-list/dist/react',
    ),
    '@udecode/plate-link/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-link/dist/react',
    ),
    '@udecode/plate-basic-marks/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-basic-marks/dist/react',
    ),
    '@udecode/plate-combobox/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-combobox/dist/react',
    ),
    '@udecode/plate-code-block/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-code-block/dist/react',
    ),
    '@udecode/plate-block-quote/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-block-quote/dist/react',
    ),
    '@udecode/plate-reset-node/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-reset-node/dist/react',
    ),
    '@udecode/plate-mention/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-mention/dist/react',
    ),
    '@udecode/plate-autoformat/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-autoformat/dist/react',
    ),
    '@udecode/plate-break/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-break/dist/react',
    ),
    '@udecode/plate-utils/react': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-utils/dist/react',
    ),

    // Also include base package aliases for non-/react imports
    '@udecode/plate-common': path.resolve(__dirname, '../../../node_modules/@udecode/plate-common'),
    '@udecode/plate-core': path.resolve(__dirname, '../../../node_modules/@udecode/plate-core'),
    '@udecode/plate-list': path.resolve(__dirname, '../../../node_modules/@udecode/plate-list'),
    '@udecode/plate-link': path.resolve(__dirname, '../../../node_modules/@udecode/plate-link'),
    '@udecode/plate-basic-marks': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-basic-marks',
    ),
    '@udecode/plate-combobox': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-combobox',
    ),
    '@udecode/plate-code-block': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-code-block',
    ),
    '@udecode/plate-block-quote': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-block-quote',
    ),
    '@udecode/plate-reset-node': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-reset-node',
    ),
    '@udecode/plate-mention': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-mention',
    ),
    '@udecode/plate-autoformat': path.resolve(
        __dirname,
        '../../../node_modules/@udecode/plate-autoformat',
    ),
    '@udecode/plate-break': path.resolve(__dirname, '../../../node_modules/@udecode/plate-break'),
    '@udecode/plate-utils': path.resolve(__dirname, '../../../node_modules/@udecode/plate-utils'),
}
