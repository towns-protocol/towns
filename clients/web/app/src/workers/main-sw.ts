import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
    cleanupOutdatedCaches,
    createHandlerBoundToURL,
    precacheAndRoute,
} from 'workbox-precaching'
import { NetworkOnly } from 'workbox-strategies'
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
    return url.pathname === '/version'
}, new NetworkOnly())

// to allow work offline
console.log('main-sw: enabling offline precaching')
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
    console.log('main-sw: notifications enabled')
    handleNotifications(self)
} else {
    console.log('main-sw: notifications disabled')
}

/**
 * The following code is used for backwards compatibility and should be removed
 * by the end  of August 2024
 *
 * Background: the app has a manual update mechanism enabled from within the app.
 * breaking changes can lock users out of the app if they don't update which
 * results in a catch-22 situation.
 *
 * we introduce a version check and force update if the version is not the latest
 * but want to do this from within the app. The following code will be triggered
 * once when this update lands and doesn't require access to the client to fullfill.
 *
 */

self.addEventListener('install', (e) => {
    e.waitUntil(checkVersionAndUpdate())
})

async function checkVersionAndUpdate() {
    const currentVersion = await getCurrentVersion()
    console.log('main-sw: currentVersion', currentVersion)

    const hasVersion = !!currentVersion

    if (!hasVersion) {
        console.log('main-sw: no version detected')
        await forceUpdate()
    }

    if (currentVersion !== VITE_APP_VERSION) {
        await setCurrentVersion(VITE_APP_VERSION)
    }
}

const VERSION_CACHE_NAME = 'versioning-cache'

async function getCurrentVersion() {
    const cache = await caches.open(VERSION_CACHE_NAME)
    const response = await cache.match('version')
    return response ? await response.text() : null
}

async function setCurrentVersion(version: string) {
    const cache = await caches.open(VERSION_CACHE_NAME)
    return cache.put('version', new Response(version))
}

async function forceUpdate() {
    self.skipWaiting()
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((client) => client.navigate(client.url))
}
