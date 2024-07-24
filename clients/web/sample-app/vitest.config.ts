/// <reference types="vitest" />
import { defineConfig } from 'vite'
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
    plugins: [tsconfigPaths()],
})
