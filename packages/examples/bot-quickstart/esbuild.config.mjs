import { build } from 'esbuild'

build({
    bundle: true,
    entryPoints: {
        'bot-quickstart': './src/index.ts',
    },
    format: 'cjs',
    logLevel: 'info',
    loader: {
        '.ts': 'ts',
        '.wasm': 'file',
    },
    external: [
        // Native modules that can't be bundled
        '@towns-protocol/olm',
    ],
    outdir: 'dist',
    outExtension: { '.js': '.cjs' },
    platform: 'node',
    assetNames: '[name]',
    sourcemap: true,
    target: 'es2022',
    minify: false,
    treeShaking: true,
}).catch((e) => {
    console.error(e)
    process.exit(1)
})
