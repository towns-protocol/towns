import { build } from 'esbuild'

build({
    entryPoints: ['./src/survey-bot.ts', './src/thread-ai-bot.ts'],
    bundle: true,
    sourcemap: 'inline',
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: 'dist',
    outExtension: { '.js': '.cjs' },
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
