import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
    addPlugins,
    cleanupOutdatedCaches,
    createHandlerBoundToURL,
    precacheAndRoute,
} from 'workbox-precaching'
import { NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { env } from '../utils/environment'
import { handleNotifications } from './notifications'

declare let self: ServiceWorkerGlobalScope

/**
 * Production service worker. Not used in development - see dev-only-sw.ts
 */

// basic PWA functionality added via vita-plugin-pwa / workbox
// enabling offline functionality and background updating
console.log('main-sw: workbox enabled')
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }
})

// clean old assets
cleanupOutdatedCaches()

// self.__WB_MANIFEST is default injection point
const manifest = self.__WB_MANIFEST

console.log('main-sw: precaching', manifest)
precacheAndRoute(manifest)

registerRoute(({ url }) => {
    return url.pathname === '/version' || url.pathname.startsWith('/data/')
}, new NetworkOnly())

registerRoute(({ url }) => {
    return !!url.pathname.match(new RegExp(`^/t/(0x[a-f0-9]{40}|[a-f0-9]{64})/?$`))
}, new NetworkFirst())

async function resetPrecache() {
    console.log('main-sw: resetting precache')
    const cacheNames = await caches.keys()
    for (const cacheName of cacheNames) {
        if (cacheName.startsWith('workbox-precache')) {
            await caches.delete(cacheName)
        }
    }
}

addPlugins([
    {
        fetchDidFail: async ({ error, request }) => {
            console.error(`main-sw: precache: fetch failed for ${request.url}:`, error)
            if (request.url.match(/\.(js|css)/)) {
                console.log('main-sw: trigger precache reset')
                void resetPrecache()
            }
        },
    },
])
// to allow work offline
console.log('main-sw: enabling offline precaching')
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
    console.log('main-sw: notifications enabled')
    handleNotifications(self)
} else {
    console.log('main-sw: notifications disabled')
}
