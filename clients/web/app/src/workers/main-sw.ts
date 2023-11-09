import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
    cleanupOutdatedCaches,
    createHandlerBoundToURL,
    precacheAndRoute,
} from 'workbox-precaching'

import { env } from '../utils/environment'
import { handleNotifications } from './notifications'
import { interceptPrivyRequests } from './middleware'

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
// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

// clean old assets
cleanupOutdatedCaches()

// to allow work offline
console.log('main-sw: enabling offline precaching')
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

interceptPrivyRequests(self)

if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
    console.log('main-sw: notifications enabled')
    handleNotifications(self)
} else {
    console.log('main-sw: notifications disabled')
}
