import { build } from 'esbuild'
import esbuildPluginPino from 'esbuild-plugin-pino'

build({
    entryPoints: {
        start: './src/start.ts',
        demo: './src/demo.ts',
    },
    bundle: true,
    sourcemap: 'inline',
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: 'dist',
    outExtension: { '.js': '.cjs' },
    plugins: [esbuildPluginPino({ transports: ['pino-pretty'] })],
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
