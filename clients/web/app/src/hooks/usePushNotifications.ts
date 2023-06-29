import { useCallback, useEffect, useRef, useState } from 'react'
import { useMyProfile } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { axiosClient } from 'api/apiClient'
import { useStore } from 'store/store'
import { env } from '../utils/environment'
import { useDevice } from './useDevice'

// always false for now
const ENABLE_PUSH_NOTIFICATIONS = env.VITE_PUSH_NOTIFICATION_ENABLED

export const usePushNotifications = () => {
    const { isPWA } = useDevice()
    const user = useMyProfile()
    const { activePushSubscription, setActivePushSubscription } = useStore()
    const didNotifyWorker = useRef<boolean>(false)

    const [permissionState, setPermissionState] = useState<NotificationPermission | undefined>(
        notificationsSupported() ? Notification.permission : undefined,
    )
    const requestPushPermission = useCallback(async () => {
        const permission = await Notification.requestPermission()
        setPermissionState(permission)
    }, [])

    const denyPushPermission = useCallback(() => {
        setPermissionState('denied')
    }, [])

    const registerForPushSubscription = useEvent(async (userId: string) => {
        const subscription = await getOrRegisterPushSubscription()
        if (!subscription) {
            console.log('did not subscribe to notification')
            return
        }
        // the user id can change, so can the push subscription returned from the browser
        // so we need to use a key that is unique to the user and the subscription
        console.log(`${userId} registered for push notifications`)
        const subscriptionKey = JSON.stringify(pushSubscriptionPostData(subscription, userId))
        if (subscriptionKey === activePushSubscription) {
            return
        }
        await addSubscriptionToPushNotificationWorker(subscription, userId)
        setActivePushSubscription(subscriptionKey)
    })

    // register for push notifications on changes to userId or permissionState
    useEffect(() => {
        if (!notificationsSupported() || permissionState !== 'granted' || !user?.userId) {
            return
        }

        const register = async (userId: string) => {
            await registerForPushSubscription(userId)
        }

        if (!didNotifyWorker.current) {
            console.log(`registering for push notifications with "${env.VITE_WEB_PUSH_WORKER_URL}"`)
            register(user.userId)
                .then(() => {
                    didNotifyWorker.current = true
                    console.log('registered for push notifications')
                })
                .catch((e) => {
                    didNotifyWorker.current = false
                    console.log('failed to register for push notifications', e)
                })
        }
    }, [user?.userId, permissionState, registerForPushSubscription])

    const displayNotificationBanner =
        (ENABLE_PUSH_NOTIFICATIONS || isPWA) &&
        permissionState !== 'granted' &&
        permissionState !== 'denied' &&
        notificationsSupported()
    return {
        requestPushPermission,
        denyPushPermission,
        permissionState,
        displayNotificationBanner,
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

function notificationsSupported(): boolean {
    return typeof Notification !== 'undefined'
}

async function addSubscriptionToPushNotificationWorker(
    subscription: PushSubscription,
    userId: string,
) {
    const data = pushSubscriptionPostData(subscription, userId)
    const url = env.VITE_WEB_PUSH_WORKER_URL
    if (!url) {
        console.error('PUSH: env.VITE_WEB_PUSH_WORKER_URL not set')
        return
    }
    console.log('PUSH: sending subscription to Push Notification Worker', data)
    return await axiosClient.post(`${url}/api/add-subscription`, JSON.stringify(data))
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

function pushSubscriptionPostData(subscription: PushSubscription, userId: string) {
    return { subscriptionObject: subscription, userId: userId }
}
