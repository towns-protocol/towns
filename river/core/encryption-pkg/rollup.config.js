import commonjs from '@rollup/plugin-commonjs'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import wasm from '@rollup/plugin-wasm'

const isProduction = process.env.NODE_ENV === 'production'

export default {
    input: '../encryption/src/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'umd',
        name: 'RiverBuildEncryption',
        sourcemap: true,
    },
    external: ['supports-color'],
    plugins: [
        isProduction && terser(), // Minify the bundle in production mode
        typescript({
            tsconfig: './tsconfig.json',
        }),
        nodePolyfills(),
        nodeResolve(),
        generatePackageJson({
            outputFolder: 'dist',
            baseContents: (pkg) => ({
                name: pkg.name,
                main: './index.js',
                types: pkg.types,
                version: pkg.version,
                peerDependencies: {
                    '@matrix-org/olm': '^3.2.15',
                },
            }),
        }),
        commonjs({
            dynamicRequireTargets: ['**/index.js'],
            ignoreDynamicRequires: true,
            ignoreGlobal: false, // Do not ignore the global variable handling,
            transformMixedEsModules: true,
        }),
        wasm({
            fileName: '[name].[extname]',
        }),
    ],
}
