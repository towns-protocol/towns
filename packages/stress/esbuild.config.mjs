import { build } from 'esbuild'
import esbuildPluginPino from 'esbuild-plugin-pino'

build({
    entryPoints: {
        start: './src/start.ts',
        demo: './src/demo.ts',
        stress: './src/stressRun.ts',
        notifications: './src/notifications.ts',
        generateWallets: './src/generateWallets.ts',
        transferFunds: './src/transferFunds.ts',
        nft: './src/nft.ts',
    },
    bundle: true,
    sourcemap: 'inline',
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: 'dist',
    outExtension: { '.js': '.cjs' },
    plugins: [esbuildPluginPino({ transports: ['pino-pretty'] })],
    external: ['@towns-protocol/olm'],
    ignoreAnnotations: true,
    assetNames: '[name]',
    loader: {
        '.ts': 'ts',
        '.wasm': 'file',
    },
    logOverride: {
        'empty-import-meta': 'silent', // Add this line to silence the warning
    },
}).catch((e) => {
    console.error(e)
    process.exit(1)
})
