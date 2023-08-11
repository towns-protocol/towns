import { useEffect } from 'react'
import { useMyProfile } from 'use-zion-client'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils/environment'
import { notificationsSupported } from './usePushNotifications'

export const usePushSubscription = () => {
    const notificationsStatus = notificationsSupported() ? Notification.permission : undefined
    const userId = useMyProfile()?.userId

    useEffect(() => {
        const abortController = new AbortController()
        if (notificationsStatus !== 'granted' || !userId) {
            return
        }
        registerForPushSubscription(userId, abortController.signal)
        return () => {
            abortController.abort()
        }
    }, [notificationsStatus, userId])
}

async function registerForPushSubscription(userId: string, signal: AbortSignal) {
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
        data.userId,
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
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
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
