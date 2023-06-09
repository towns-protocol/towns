import { APP_NOTIFICATIONS_BROADCAST_CHANNEL } from './types.d'
import { appNotificationFromPushEvent } from './notificationParsers'

export function handleNotifications(worker: ServiceWorkerGlobalScope) {
    const broadcastChannel = new BroadcastChannel(APP_NOTIFICATIONS_BROADCAST_CHANNEL)

    worker.addEventListener('push', (event) => {
        if (!event.data) {
            console.log('sw: push event contains no data')
            return
        }

        const jsonString = event.data.text() || '{}'
        const notification = appNotificationFromPushEvent(jsonString)
        if (!notification) {
            console.log("sw: Couldn't parse notification")
            return
        }

        event.waitUntil(
            worker.registration.showNotification('Towns', {
                body: 'You have a new message',
                silent: false,
                icon: '/pwa/maskable_icon_x192.png',
                data: event.data.text(),
            }),
        )
    })

    worker.addEventListener('notificationclick', (event) => {
        console.log('sw: Clicked on a notification', event)
        broadcastChannel.postMessage(event.notification.data)
        event.notification.close()
    })
}
