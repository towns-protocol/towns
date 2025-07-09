import { build, context } from 'esbuild'
import process from 'node:process'
import console from 'node:console'

const isWatch = process.argv.includes('--watch')

const config = {
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
    external: ['@towns-protocol/olm'],
    outdir: 'dist',
    outExtension: { '.js': '.cjs' },
    platform: 'node',
    assetNames: '[name]',
    sourcemap: true,
    target: 'es2022',
    minify: false,
    treeShaking: true,
}

if (isWatch) {
    const ctx = await context(config)
    await ctx.watch()

    console.log('Watching for changes...')

    process.on('SIGINT', () => {
        void ctx.dispose().then(() => {
            process.exit(0)
        })
    })
} else {
    build(config).catch((e) => {
        console.error(e)
        process.exit(1)
    })
}
