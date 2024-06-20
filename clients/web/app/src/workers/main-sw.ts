import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
    cleanupOutdatedCaches,
    createHandlerBoundToURL,
    precacheAndRoute,
} from 'workbox-precaching'

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

const manifest = self.__WB_MANIFEST
console.log('main-sw: inject manifest', manifest)

precacheAndRoute(manifest, {
    // just in case, but these options shouldn't be needed since we are using
    // the register route below redirecting all navigation requests to index.html
    cleanURLs: false,
    ignoreURLParametersMatching: [/.*/],
})

// to allow work offline
console.log('main-sw: enabling offline precaching')
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
    console.log('main-sw: notifications enabled')
    handleNotifications(self)
} else {
    console.log('main-sw: notifications disabled')
}
