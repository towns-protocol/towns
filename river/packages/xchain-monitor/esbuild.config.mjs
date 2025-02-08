import { build } from 'esbuild'
import esbuildPluginPino from 'esbuild-plugin-pino'

build({
    bundle: true,
    entryPoints: {
        node_esbuild: './src/index.ts',
    }, // Rename the entry point to control the output file name
    format: 'cjs',
    logLevel: 'info',
    external: [
        // esbuild cannot bundle native modules
        '@datadog/native-metrics',

        // required if you use profiling
        '@datadog/pprof',

        // required if you encounter graphql errors during the build step
        'graphql/language/visitor',
        'graphql/language/printer',
        'graphql/utilities',
    ],
    outdir: 'dist',
    outExtension: { '.js': '.cjs' }, // Ensure the output file has .cjs extension
    platform: 'node',
    plugins: [esbuildPluginPino({ transports: ['pino-pretty'] })],
    assetNames: '[name]',
    loader: {
        '.ts': 'ts',
        '.wasm': 'file',
    },
    sourcemap: true,
    target: 'es2022',
    minify: false, // No minification for easier debugging. Add minification in production later
    treeShaking: true, // Enable tree shaking to remove unused code
}).catch((e) => {
    console.error(e)
    process.exit(1)
})
