/// <reference types="vitest" />
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'
import { plateImports } from './vite.config'

export default defineConfig({
    test: {
        css: true,
        setupFiles: ['./vitest.setup.ts', 'fake-indexeddb/auto'],
        environment: 'jsdom',
        globals: true, // w/out this then testing-library requires cleanup() after every test https://vitest.dev/guide/migration.html
        deps: {
            fallbackCJS: true,
            inline: [
                '@matrix-org/olm', // wasm error :(
                // workaround to allow tests to work with `use-towns-client`
                // "Vite will process inlined modules. This could be helpful to handle packages that ship .js in ESM format (that Node can't handle)."
                /..\/lib\/dist\/(.*\.js)$/,
                /.*.\/core\/proto\/dist\/(.*\.js)$/,
                /.*.\/core\/sdk\/dist\/(.*\.js)$/,
                /.*.\/core\/waterproof\/dist\/(.*\.js)$/,
                /.*.\/core\/web3\/dist\/(.*\.js)$/,
                'vitest-canvas-mock',
                '@privy-io/js-sdk-core',
            ],
        },
    },
    resolve: {
        alias: {
            ...plateImports,
        },
    },
    plugins: [tsconfigPaths(), vanillaExtractPlugin(), VitePWA()] as any,
    define: {
        VITE_APP_VERSION: JSON.stringify('1.2.3'),
        VITE_APP_COMMIT_HASH: JSON.stringify('aabbccdd'),
        VITE_APP_TIMESTAMP: JSON.stringify(Date.now()),
        VITE_APP_MODE: JSON.stringify(process.env.MODE ?? ''),
    },
})
