import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { NotificationSettingsClient, useTownsContext } from 'use-towns-client'
import { WEB_PUSH_NAVIGATION_CHANNEL, WEB_PUSH_SUBSCRIPTIONS_CHANNEL } from 'workers/types.d'

import { useNotificationRoute } from './useNotificationRoute'
import { useDevice } from './useDevice'
import { Analytics } from './useAnalytics'

const TAG = '[useAppNotifications][route]'
const log = console.log

export function useAppNotifications() {
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const isTouchRef = useRef<boolean>(isTouch)
    const { urlPathnameSafeToNavigate } = useNotificationRoute()
    const { notificationSettingsClient } = useTownsContext()

    const navigateTo = useEvent((path: string) => {
        navigate(path, {
            state: { fromNotification: true },
        })
    })

    useEffect(() => {
        //log(TAG, 'PUSH: mounted: open broadcast channel')
        const broadcastChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)
        broadcastChannel.onmessage = (event) => {
            const path = urlPathnameSafeToNavigate(event.data.path, event.data.channelId)
            log(TAG, 'PUSH: received navigation event on broadcast channel', {
                deviceType: isTouchRef.current ? 'mobile' : 'desktop',
                eventDataPath: event.data.path,
                eventDataChannelId: event.data.channelId,
                eventDataThreadId: event.data.threadId,
                url: path,
            })
            Analytics.getInstance().track('clicked notification', {
                spaceId: event.data.spaceId,
                channelId: event.data.channelId,
            })
            navigateTo(path)
        }

        return () => {
            //log(TAG, 'PUSH: unmounted: close broadcast channel')
            broadcastChannel.close()
        }
    }, [navigateTo, urlPathnameSafeToNavigate])

    useEffect(() => {
        if (!notificationSettingsClient) {
            return
        }
        //log(TAG, 'PUSH: mounted: open subscriptions channel')
        const subscriptionsChannel = new BroadcastChannel(WEB_PUSH_SUBSCRIPTIONS_CHANNEL)
        subscriptionsChannel.onmessage = (event) => {
            log(TAG, 'PUSH: received subscriptions event on broadcast channel', {
                eventData: event.data,
            })
            const data = {
                oldSubscription: event.data.oldSubscription as PushSubscription | null,
                newSubscription: event.data.newSubscription as PushSubscription | null,
            }
            if (data.oldSubscription || data.newSubscription) {
                log(TAG, 'PUSH: push subscription changed', data)
            }
            if (data.oldSubscription) {
                deletePushSubscription(data.oldSubscription, notificationSettingsClient)
            }
            if (data.newSubscription) {
                subscribeToPushNotifications(data.newSubscription, notificationSettingsClient)
            }
        }

        return () => {
            //log(TAG, 'PUSH: unmounted: close subscriptions channel')
            subscriptionsChannel.close()
        }
    }, [notificationSettingsClient])
}

function deletePushSubscription(
    subscription: PushSubscription,
    notificationSettingsClient: NotificationSettingsClient,
) {
    const data = subscription.toJSON()
    if (!data.keys?.p256dh || !data.keys?.auth) {
        console.error('PUSH deletePushSubscription(): missing p256dh or auth', data.keys)
        return
    }
    notificationSettingsClient.unsubscribeWebPush({
        endpoint: subscription.endpoint,
        keys: {
            p256dh: data.keys.p256dh,
            auth: data.keys.auth,
        },
    })
}

function subscribeToPushNotifications(
    subscription: PushSubscription,
    notificationSettingsClient: NotificationSettingsClient,
) {
    const data = subscription.toJSON()
    if (!data.keys?.p256dh || !data.keys?.auth) {
        console.error('PUSH subscribeToPushNotifications(): missing p256dh or auth', data.keys)
        return
    }
    notificationSettingsClient.subscribeWebPush({
        endpoint: subscription.endpoint,
        keys: {
            p256dh: data.keys.p256dh,
            auth: data.keys.auth,
        },
    })
}
