import { handleNotifications } from './notifications'

declare let self: ServiceWorkerGlobalScope

/**
 * Development service worker. Not used in production - see main-sw.ts
 */

self.skipWaiting()

handleNotifications(self)
