/// <reference types="vitest" />
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    test: {
        setupFiles: ['./vitest.setup.ts'],
        environment: 'happy-dom',
        deps: {
            fallbackCJS: true,
            inline: [
                // workaround to allow tests to work with `use-zion-client`
                // "Vite will process inlined modules. This could be helpful to handle packages that ship .js in ESM format (that Node can't handle)."
                /..\/lib\/dist\/(.*\.js)$/,
                'vitest-canvas-mock',
            ],
        },
    },
    plugins: [tsconfigPaths(), vanillaExtractPlugin()],
})
