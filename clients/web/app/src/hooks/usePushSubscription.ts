import { useCallback, useEffect } from 'react'
import { NotificationSettingsClient, useTownsContext } from 'use-towns-client'
import { env } from 'utils/environment'
import { notificationsSupported } from './usePushNotifications'

const PUSH_SUBSCRIPTION_PUBLIC_KEY_ID = 'towns/public-push-key'

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
            await getAndDeletePushSubscription(notificationSettingsClient)
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

    const vapidPK = env.VITE_WEB_PUSH_APPLICATION_SERVER_KEY
    if (!vapidPK) {
        console.warn('PUSH: VITE_WEB_PUSH_APPLICATION_SERVER_KEY not set')
        return
    }

    const push = await getLocalPushSubscription()

    if (push.subscription && push.previousVapidPK !== vapidPK) {
        console.log('PUSH: deleting previous subscription')
        await deletePushSubscription(notificationSettingsClient, push.subscription)
    }

    let subscription: PushSubscription | undefined

    if (push.subscription && push.previousVapidPK === vapidPK) {
        console.log('PUSH: subscription previously registered')
        subscription = push.subscription
    } else {
        subscription = await registerLocalPushSubscription(vapidPK, push.registration)
    }

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

async function getLocalPushSubscription(): Promise<{
    registration: ServiceWorkerRegistration
    subscription: PushSubscription | null
    previousVapidPK: string | null
}> {
    const registration = await navigator.serviceWorker.ready
    try {
        console.log('PUSH: got registration')
        const subscription = await registration.pushManager.getSubscription()
        console.log('PUSH: got subscription')
        const previousVapidPK = localStorage.getItem(PUSH_SUBSCRIPTION_PUBLIC_KEY_ID)
        return { registration, subscription, previousVapidPK }
    } catch (e) {
        console.error('PUSH: failed to get subscription', e)
        return { registration, subscription: null, previousVapidPK: null }
    }
}

async function registerLocalPushSubscription(
    vapidPK: string,
    registration: ServiceWorkerRegistration,
) {
    console.log('PUSH: getting subscription')

    const convertedKey = urlB64ToUint8Array(vapidPK)
    console.log('PUSH: subscribing to push notifications', vapidPK)
    console.log('PUSH: convertedKey', convertedKey)
    try {
        const result = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
        })
        localStorage.setItem(PUSH_SUBSCRIPTION_PUBLIC_KEY_ID, vapidPK)
        return result
    } catch (e) {
        console.error('PUSH: failed to get subscription', e)
    }
    return undefined
}

async function getAndDeletePushSubscription(
    notificationSettingsClient: NotificationSettingsClient,
) {
    console.log('PUSH: delete push subscription')
    const push = await getLocalPushSubscription()
    if (!push.subscription) {
        return
    }
    return deletePushSubscription(notificationSettingsClient, push.subscription)
}

async function deletePushSubscription(
    notificationSettingsClient: NotificationSettingsClient,
    subscription: PushSubscription,
) {
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
        const unsubResult = await subscription.unsubscribe()
        console.log('PUSH: deleted push subscription', { unsubResult })
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
