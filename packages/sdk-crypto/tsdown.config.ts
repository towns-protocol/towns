import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/node/index.ts', 'src/web/index.ts', 'src/common/index.ts'],
    sourcemap: true,
    clean: true,
    format: ['cjs', 'esm'],
    dts: true,
})
