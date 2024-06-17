import { useCallback, useEffect } from 'react'
import { useMyUserId } from 'use-towns-client'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils/environment'
import { notificationsSupported } from './usePushNotifications'

export const usePushSubscription = () => {
    const notificationsStatus = notificationsSupported() ? Notification.permission : undefined
    const userId = useMyUserId()

    useEffect(() => {
        const abortController = new AbortController()
        if (notificationsStatus !== 'granted' || !userId) {
            return
        }
        const register = async function () {
            await registerForPushSubscription(userId, abortController.signal)
        }
        register()
        return () => {
            abortController.abort()
        }
    }, [notificationsStatus, userId])
}

async function registerForPushSubscription(userId: string, signal: AbortSignal) {
    console.log('PUSH: registering for push notifications')
    const subscription = await getOrRegisterPushSubscription()
    if (!subscription) {
        return
    }

    const data = { subscriptionObject: subscription.toJSON(), userId: userId }
    const url = env.VITE_WEB_PUSH_WORKER_URL
    if (!url) {
        console.error('PUSH: env.VITE_WEB_PUSH_WORKER_URL not set')
        return
    }
    console.log(
        'PUSH: sending subscription to Push Notification Worker',
        'userId',
        data.userId,
        'endpoint',
        data.subscriptionObject.endpoint,
    )
    try {
        await axiosClient.post(`${url}/api/add-subscription`, data, {
            signal: signal,
        })
        console.log('PUSH: did register for push notifications')
    } catch (e) {
        console.error('PUSH: failed to send subscription to Push Notification Worker', e)
    }
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

async function deletePushSubscription(userId: string) {
    console.log('PUSH: delete push subscription')
    const subscription = await getOrRegisterPushSubscription()
    if (!subscription) {
        return
    }

    const data = { subscriptionObject: subscription.toJSON(), userId: userId }
    const url = env.VITE_WEB_PUSH_WORKER_URL
    if (!url) {
        console.error('PUSH: env.VITE_WEB_PUSH_WORKER_URL not set')
        return
    }
    try {
        await axiosClient.post(`${url}/api/remove-subscription`, data)
        console.log('PUSH: deleted push subscription')
    } catch (e) {
        console.error('PUSH: failed to delete push subscription', e)
    }
}

async function unsubscribePushSubscription() {
    if (!navigator.serviceWorker.controller) {
        console.info('PUSH: skipping unsubscribe, no service worker controller')
        return
    }

    try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
            await subscription.unsubscribe()
        }
    } catch (e) {
        console.error('PUSH: failed to unsubscribe', e)
    }
}

export const useUnsubscribeNotification = () => {
    const userId = useMyUserId()

    const unsubscribeNotification = useCallback(async () => {
        if (userId) {
            await deletePushSubscription(userId)
        }
        await unsubscribePushSubscription()
    }, [userId])

    return unsubscribeNotification
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
