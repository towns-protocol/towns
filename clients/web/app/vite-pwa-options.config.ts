import { VitePWAOptions } from 'vite-plugin-pwa'
import { APP_NAME } from './src/data/constants'

export interface AppPwaDevOptions {
    enablePushNotification?: boolean
}

export function vitePWAOptions(
    mode: string,
    env: Record<string, string>,
    options: Partial<VitePWAOptions> = {},
): Partial<VitePWAOptions> {
    const isDev = mode === 'development'
    let developmentOptions: Partial<VitePWAOptions> = {}

    if (isDev) {
        // TODO: once VITE_PUSH_NOTIFICATION_ENABLED is no longer a flag, we can change the env var to something more generic like VITE_DEV_ONLY_SW_ENABLED
        if (env.VITE_PUSH_NOTIFICATION_ENABLED === 'true') {
            developmentOptions = {
                filename: 'dev-only-sw.ts',
                devOptions: {
                    enabled: true,
                    type: 'module',
                },
            }
        } else {
            developmentOptions = {
                // this combo of options allows for auto removing any dev-only service workers
                devOptions: {
                    enabled: true,
                },
                selfDestroying: true,
            }
        }
    }

    return {
        strategies: 'injectManifest',
        srcDir: 'src/workers',
        filename: 'main-sw.ts',
        injectManifest: {
            globPatterns: ['{.,assets,fonts,pwa}/*.{js,css,html,ico,png,webp,svg,woff2,wasm}'],
            // 64 MB PWA precache limit
            maximumFileSizeToCacheInBytes: 64 * 1024 * 1024,
        },
        workbox: {
            sourcemap: true,
        },
        includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'masked-icon.svg'],

        manifest: {
            name: APP_NAME,
            short_name: APP_NAME,
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
        // true kills the service worker on prod
        // false will turn it back on
        // don't change other vite-pwa plugin config when enabling/disabling this https://vite-pwa-org.netlify.app/guide/unregister-service-worker.html#unregister-service-worker
        // If we have to use this, the observed behavior is:
        // - from false -> true === service worker is unregistered for connected users once update interval is reached
        // - from true -> false === service worker is not registered for connected users until they refresh the page again
        // - for non-connected users, doesn't matter, they will get the new service worker on next visit
        selfDestroying: env.DESTROY_PROD_SERVICE_WORKER === 'true',
        ...developmentOptions,
        ...options,
    }
}
