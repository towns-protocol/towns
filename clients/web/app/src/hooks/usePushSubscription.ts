import { useCallback, useEffect } from 'react'
import { NotificationSettingsClient, useTownsContext } from 'use-towns-client'
import { env } from 'utils/environment'
import { notificationsSupported } from './usePushNotifications'

export const usePushSubscription = () => {
    const notificationsStatus = notificationsSupported() ? Notification.permission : undefined
    const { notificationSettingsClient } = useTownsContext()
    useEffect(() => {
        console.log('PUSH: useEffect', {
            notificationsStatus,
            notificationSettingsClient: notificationSettingsClient !== undefined,
        })
        if (notificationsStatus !== 'granted' || !notificationSettingsClient) {
            return
        }
        const abortController = new AbortController()
        void registerForPushSubscription(notificationSettingsClient, abortController.signal)
        return () => {
            abortController.abort()
        }
    }, [notificationsStatus, notificationSettingsClient])
}

export const useUnsubscribeNotification = () => {
    const { notificationSettingsClient } = useTownsContext()

    const unsubscribeNotification = useCallback(async () => {
        if (notificationSettingsClient) {
            await deletePushSubscription(notificationSettingsClient)
        } else {
            console.error('PUSH: notificationSettingsClient not found')
        }
    }, [notificationSettingsClient])

    return unsubscribeNotification
}

async function registerForPushSubscription(
    notificationSettingsClient: NotificationSettingsClient,
    signal: AbortSignal,
) {
    console.log('PUSH: registering for push notifications')
    const userId = notificationSettingsClient.userId

    const subscription = await getOrRegisterPushSubscription()
    if (!subscription) {
        return
    }

    const data = { subscriptionObject: subscription.toJSON(), userId: userId }
    console.log(
        'PUSH: sending subscription to Push Notification Worker',
        'userId',
        data.userId,
        'endpoint',
        data.subscriptionObject.endpoint,
    )
    try {
        if (!data.subscriptionObject.keys?.p256dh || !data.subscriptionObject.keys?.auth) {
            console.error('PUSH: missing p256dh or auth', data.subscriptionObject.keys)
            return
        }
        await notificationSettingsClient.subscribeWebPush({
            endpoint: subscription.endpoint,
            keys: {
                p256dh: data.subscriptionObject.keys.p256dh,
                auth: data.subscriptionObject.keys.auth,
            },
        })
    } catch (e) {
        console.error('PUSH: failed to subscribe to web push', e)
    }
    // <END new way>
}

async function getOrRegisterPushSubscription() {
    console.log('PUSH: getting subscription')
    try {
        const registration = await navigator.serviceWorker.ready
        console.log('PUSH: got registration')
        const subscription = await registration.pushManager.getSubscription()
        console.log('PUSH: got subscription')
        if (subscription) {
            return subscription
        }

        const applicationServerKey = env.VITE_WEB_PUSH_APPLICATION_SERVER_KEY
        if (!applicationServerKey) {
            console.warn('PUSH: VITE_WEB_PUSH_APPLICATION_SERVER_KEY not set')
            return
        }
        return await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(applicationServerKey),
        })
    } catch (e) {
        console.error('PUSH: failed to get subscription', e)
    }
    return undefined
}

async function deletePushSubscription(notificationSettingsClient: NotificationSettingsClient) {
    console.log('PUSH: delete push subscription')
    const subscription = await getOrRegisterPushSubscription()
    if (!subscription) {
        return
    }
    const userId = notificationSettingsClient.userId
    const data = { subscriptionObject: subscription.toJSON(), userId: userId }
    if (!data.subscriptionObject.keys?.p256dh || !data.subscriptionObject.keys?.auth) {
        console.error('PUSH: missing p256dh or auth', data.subscriptionObject.keys)
        return
    }
    try {
        await notificationSettingsClient.unsubscribeWebPush({
            endpoint: subscription.endpoint,
            keys: {
                p256dh: data.subscriptionObject.keys.p256dh,
                auth: data.subscriptionObject.keys.auth,
            },
        })
        console.log('PUSH: deleted push subscription')
    } catch (e) {
        console.error('PUSH: failed to delete push subscription', e)
    }
}

function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
