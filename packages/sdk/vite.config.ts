import { defineConfig, mergeConfig } from 'vite'
import { tanstackViteConfig } from '@tanstack/config/vite'

const config = defineConfig({
    optimizeDeps: {
        exclude: ['@connectrpc/connect-node'],
    },
})
// vite.config.ts
// connect-node doesn't compile with esbuild, so we exclude it here
// we only use it in node, via `require` so this should be fine
export default mergeConfig(
    tanstackViteConfig({
        entry: ['./src/index.ts'],
        srcDir: './src',
    }),
    config,
)
