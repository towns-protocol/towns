import { build } from 'esbuild'
import esbuildPluginPino from 'esbuild-plugin-pino'

build({
    entryPoints: {
        start: './src/start.ts',
        demo: './src/demo.ts',
        // NOTE: For some reason esbuild is not picking it up
        mls_rs_wasm_bg: '@river-build/mls-rs-wasm-node/mls_rs_wasm_bg.wasm',
    },
    bundle: true,
    sourcemap: 'inline',
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: 'dist',
    outExtension: { '.js': '.cjs' },
    plugins: [esbuildPluginPino({ transports: ['pino-pretty'] })],
    alias: {
        '@river-build/mls-rs-wasm': '@river-build/mls-rs-wasm-node',
    },
    ignoreAnnotations: true,
    assetNames: '[name]',
    loader: {
        '.ts': 'ts',
        '.wasm': 'file',
    },
}).catch((e) => {
    console.error(e)
    process.exit(1)
})
