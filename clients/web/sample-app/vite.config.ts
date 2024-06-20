import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { PluginOption, defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { visualizer } from 'rollup-plugin-visualizer'

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
// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) =>
    defineConfig({
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
                },
            },
            minify: false, // Ensure esbuild is used for minification
        },
        define: {
            APP_VERSION: JSON.stringify(process.env.npm_package_version),
        },
        assetsInclude: ['**/*.png', '**/*.svg'],
        plugins: [nodePolyfills(), react(), tsconfigPaths(), vanillaExtractPlugin()].concat(
            mode === 'development' ? devPlugins : prodPlugins,
        ) as PluginOption[],
        server: {
            port: 3001,
            hmr: {
                overlay: false,
            },
        },
    })
