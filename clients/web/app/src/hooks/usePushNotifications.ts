import { useCallback, useEffect, useState } from 'react'
import { env } from '../utils/environment'

// always false for now
const ENABLE_PUSH_NOTIFICATIONS = false

export const usePushNotifications = () => {
    const [permissionState, setPermissionState] = useState<NotificationPermission | undefined>(
        notificationsSupported() ? Notification.permission : undefined,
    )

    const [pushSubscriptionInfo, setPushSubscriptionInfo] = useState<string | undefined>(undefined)

    const requestPushPermission = useCallback(async () => {
        const permission = await Notification.requestPermission()
        setPermissionState(permission)
    }, [])

    const denyPushPermission = useCallback(() => {
        setPermissionState('denied')
    }, [])

    useEffect(() => {
        console.log('PUSH', permissionState)
        if (permissionState !== 'granted') {
            return
        }

        function handlePushSubscription(subscription: PushSubscription) {
            const stringifiedSubscription = JSON.stringify(subscription)
            setPushSubscriptionInfo(stringifiedSubscription)
        }

        async function updateSubscription() {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager
                .getSubscription()
                .then((subscription) => {
                    console.log('PUSH: subscription', subscription)
                    if (subscription) {
                        console.log('PUSH: already subscribed')
                        return subscription
                    }

                    console.log('PUSH: creating new subscription')
                    const applicationServerKey = env.VITE_WEB_PUSH_APPLICATION_SERVER_KEY
                    if (!applicationServerKey) {
                        console.warn('PUSH: VITE_WEB_PUSH_APPLICATION_SERVER_KEY not set')
                        return
                    }
                    return registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlB64ToUint8Array(
                            env.VITE_WEB_PUSH_APPLICATION_SERVER_KEY ?? '',
                        ),
                    })
                })

            if (subscription) {
                console.log('PUSH: Subscribed')
                handlePushSubscription(subscription)
            }
        }

        updateSubscription()
    }, [permissionState])

    const displayNotificationBanner =
        ENABLE_PUSH_NOTIFICATIONS &&
        permissionState !== 'granted' &&
        permissionState !== 'denied' &&
        notificationsSupported()
    return {
        pushSubscriptionInfo,
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
