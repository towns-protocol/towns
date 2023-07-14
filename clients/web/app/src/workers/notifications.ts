import { AppNotification, WEB_PUSH_NAVIGATION_CHANNEL } from './types.d'
import { appNotificationFromPushEvent } from './notificationParsers'
import { getServiceWorkerMuteSettings } from '../store/useMuteSettings'

export function handleNotifications(worker: ServiceWorkerGlobalScope) {
    const navigationChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)

    worker.addEventListener('push', async (event) => {
        if (!event.data) {
            console.log('sw: push event contains no data')
            return
        }
        const jsonString = event.data.text() || '{}'
        console.log('sw: received notification', jsonString)
        const notification = appNotificationFromPushEvent(jsonString)

        if (!notification) {
            console.log("sw: Couldn't parse notification")
            return
        }

        const { mutedChannels, mutedSpaces } = await getServiceWorkerMuteSettings()

        if (mutedSpaces[notification.content.spaceId]) {
            console.log('sw: Space is muted, not showing notification')
            return
        }

        if (mutedChannels[notification.content.channelId]) {
            console.log('sw: Channel is muted, not showing notification')
            return
        }

        const { title, body } = getNotificationContent(notification)
        const data = event.data.text()
        console.log('sw: received notification data', data)
        await worker.registration.showNotification(title, {
            body,
            silent: false,
            icon: '/pwa/maskable_icon_x192.png',
            data,
        })

        console.log('sw: Notification shown')
    })

    worker.addEventListener('notificationclick', (event) => {
        console.log('sw: Clicked on a notification', event)
        navigationChannel.postMessage(event.notification.data)
        event.notification.close()
    })
}

function getNotificationContent(notification: AppNotification): { title: string; body: string } {
    // todo: fetch the name of the channel/space from the store / cache
    const townName = notification.content.spaceId
    const channelName = notification.content.channelId
    switch (notification.notificationType) {
        case 'new_message':
            return {
                title: townName,
                body: `New encrypted message in ${channelName}`,
            }
        case 'mention':
            return {
                title: townName,
                body: `You were mentioned in ${channelName}`,
            }
        default:
            return {
                title: 'Town',
                body: 'New Notification',
            }
    }
}
