import { useCallback } from 'react'
import { useStore } from 'store/store'
import { env } from '../utils/environment'
import { isMacOS, isSafari, useDevice } from './useDevice'
const ENABLE_PUSH_NOTIFICATIONS = env.VITE_PUSH_NOTIFICATION_ENABLED

export const usePushNotifications = () => {
    const { isPWA } = useDevice()
    const { pushNotificationsPromptClosed, setPushNotificationsPromptClosed } = useStore()
    const permissionState = notificationsSupported() ? Notification.permission : undefined

    const requestPushPermission = useCallback(async () => {
        await Notification.requestPermission()
        setPushNotificationsPromptClosed(false)
    }, [setPushNotificationsPromptClosed])

    const denyPushPermission = useCallback(() => {
        setPushNotificationsPromptClosed(true)
    }, [setPushNotificationsPromptClosed])

    const simplifiedPermissionState: 'granted' | 'soft-denied' | 'hard-denied' | 'default' =
        permissionState === 'granted'
            ? 'granted'
            : permissionState === 'denied'
            ? 'hard-denied'
            : pushNotificationsPromptClosed
            ? 'soft-denied'
            : 'default'

    const displayNotificationBanner =
        (ENABLE_PUSH_NOTIFICATIONS || isPWA) &&
        simplifiedPermissionState === 'default' &&
        !(isSafari() && isMacOS() && isPWA) &&
        notificationsSupported()

    return {
        requestPushPermission,
        denyPushPermission,
        simplifiedPermissionState,
        displayNotificationBanner,
    }
}

export function notificationsSupported(): boolean {
    return typeof Notification !== 'undefined'
}
