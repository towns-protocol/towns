import { defineConfig } from 'vite'
// vite.config.ts
// connect-node doesn't compile with esbuild, so we exclude it here
// we only use it in node, via `require` so this should be fine
export default defineConfig({
    optimizeDeps: {
        exclude: ['@connectrpc/connect-node'],
    },
})
