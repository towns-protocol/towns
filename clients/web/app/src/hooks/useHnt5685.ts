import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { NotificationCurrentUser } from 'store/notificationCurrentUser'
import { SECOND_MS } from 'data/constants'
import { useDevice } from './useDevice'

export interface NotificationRouteInfo {
    notificationDeepLink: string
    search: string
    notificaitonTimestamp: number
}

// https://linear.app/hnt-labs/issue/HNT-5685/notifications-for-mobile-pwa-arent-deep-linking-for-me-when-the-app-is
export function useHnt5685() {
    const [notificationCurrentUser] = useState<NotificationCurrentUser>(
        new NotificationCurrentUser(),
    )
    const [notificationRouteInfo, setNotificationRouteInfo] = useState<
        NotificationRouteInfo | undefined
    >(undefined)
    const { isTouch } = useDevice()
    const location = useLocation()

    const currentUser = useLiveQuery(async () => {
        if (notificationCurrentUser) {
            // trigger a re-render when the lastUrlTimestamp is updated
            // and within the last t seconds
            const timeDiff = Date.now() - 10 * SECOND_MS
            const cu = await notificationCurrentUser.currentUser
                .where('lastUrlTimestamp')
                .above(timeDiff)
                .first()
            return cu
        }
    }, [])

    useEffect(() => {
        const getUrlFromNotificationCurrentUser = async (): Promise<void> => {
            setNotificationRouteInfo(undefined)
            const urlFromNotification = currentUser?.lastUrl
            if (urlFromNotification && currentUser?.lastUrlTimestamp) {
                const url = new URL(urlFromNotification, window.location.origin)
                console.log('[useHnt5685][route] setNotificationRouteInfo', 'route', {
                    locationPathname: location.pathname,
                    storeUrlPathname: url.pathname,
                    locationSearch: location.search,
                    storeUrlSearch: url.search,
                    lastUrlTimestamp: currentUser.lastUrlTimestamp,
                    deviceType: isTouch ? 'mobile' : 'desktop',
                })
                setNotificationRouteInfo({
                    notificationDeepLink: url.pathname,
                    search: url.search,
                    notificaitonTimestamp: currentUser.lastUrlTimestamp,
                })
            }
        }

        // hnt-5685: Workaround for touch devices to navigate to the initial link
        // when the app is opened as a new window from a notification tap
        getUrlFromNotificationCurrentUser()
    }, [
        currentUser?.lastUrl,
        currentUser?.lastUrlTimestamp,
        isTouch,
        location.pathname,
        location.search,
    ])

    return notificationRouteInfo
}
