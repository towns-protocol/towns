/// <reference types="vitest" />
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    test: {
        setupFiles: ['./vitest.setup.ts'],
        environment: 'jsdom',
        globals: true, // w/out this then testing-library requires cleanup() after every test https://vitest.dev/guide/migration.html
        deps: {
            fallbackCJS: true,
            inline: [
                '@matrix-org/olm', // wasm error :(
                // workaround to allow tests to work with `use-zion-client`
                // "Vite will process inlined modules. This could be helpful to handle packages that ship .js in ESM format (that Node can't handle)."
                /..\/lib\/dist\/(.*\.js)$/,
                /.*.\/casablanca\/proto\/dist\/(.*\.js)$/,
                /.*.\/casablanca\/sdk\/dist\/(.*\.js)$/,
                /.*.\/casablanca\/mecholm\/dist\/(.*\.js)$/,
                'vitest-canvas-mock',
            ],
        },
    },
    plugins: [tsconfigPaths(), vanillaExtractPlugin(), VitePWA()] as any,
    define: {
        APP_VERSION: JSON.stringify('1.2.3'),
        APP_COMMIT_HASH: JSON.stringify('aabbccdd'),
    },
})
