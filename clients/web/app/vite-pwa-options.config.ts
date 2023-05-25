import { VitePWAOptions } from 'vite-plugin-pwa'

export const vitePWAOptions: Partial<VitePWAOptions> = {
    devOptions: {
        enabled: false,
    },
    strategies: 'injectManifest',
    srcDir: 'src/workers',
    filename: 'main-sw.ts',
    injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 5000000,
    },

    workbox: {
        sourcemap: true,
    },

    includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'masked-icon.svg'],

    manifest: {
        name: 'Towns',
        icons: [
            {
                src: 'pwa/rounded_x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: 'pwa/maskable_icon_x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: 'pwa/maskable_icon_x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        theme_color: '#151418',
        background_color: '#151418',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
    },
}
