import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/node/index.ts', 'src/web/index.ts', 'src/common/index.ts'],
    splitting: false,
    sourcemap: true,
    clean: true,
    format: ['cjs', 'esm'],
    dts: true,
})
