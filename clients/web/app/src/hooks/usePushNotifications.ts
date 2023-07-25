import { useCallback, useState } from 'react'
import { env } from '../utils/environment'
import { useDevice } from './useDevice'

const ENABLE_PUSH_NOTIFICATIONS = env.VITE_PUSH_NOTIFICATION_ENABLED

export const usePushNotifications = () => {
    const { isPWA } = useDevice()

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

export function notificationsSupported(): boolean {
    return typeof Notification !== 'undefined'
}
