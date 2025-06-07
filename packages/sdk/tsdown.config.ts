import { defineConfig } from 'tsdown'

export default [
    defineConfig({
        entry: ['src/index.ts'],
        outDir: 'dist/node',
        sourcemap: true,
        clean: true,
        format: ['cjs', 'esm'],
        dts: true,
        silent: true,
        platform: 'node',
    }),
    defineConfig({
        entry: ['src/index.ts'],
        outDir: 'dist/browser',
        sourcemap: true,
        clean: true,
        format: ['cjs', 'esm'],
        dts: true,
        silent: true,
        platform: 'browser',
    }),
]
