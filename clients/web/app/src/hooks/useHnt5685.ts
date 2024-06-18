import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { NotificationCurrentUser } from 'store/notificationCurrentUser'
import { SECOND_MS } from 'data/constants'
import { useDevice } from './useDevice'

export interface NotificationRouteInfo {
    notificationUrlPathname: string
    notificationUrlSearch: string
    notificationClickedTimestamp: number
    spaceId?: string
    channelId?: string
    threadId?: string
    hasVisitedUrl?: boolean
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
            // trigger a re-render when the notificationClickedTimestamp is updated
            // and within the last t seconds
            const timeDiff = Date.now() - 10 * SECOND_MS
            const cu = await notificationCurrentUser.currentUser
                .where('notificationClickedTimestamp')
                .above(timeDiff)
                .first()
            return cu
        }
    }, [])

    useEffect(() => {
        const getUrlFromNotificationCurrentUser = async (): Promise<void> => {
            setNotificationRouteInfo(undefined)
            const urlFromNotification = currentUser?.notificationUrl
            if (
                urlFromNotification &&
                currentUser?.notificationClickedTimestamp &&
                !currentUser.hasVisitedUrl
            ) {
                const url = new URL(urlFromNotification, window.location.origin)
                console.log('[useHnt5685][route] setNotificationRouteInfo', 'route', {
                    visitedUrl: currentUser.hasVisitedUrl,
                    locationPathname: location.pathname,
                    notificationUrlPathname: url.pathname,
                    locationSearch: location.search,
                    notificationUrlSearch: url.search,
                    notificationClickedTimestamp: currentUser.notificationClickedTimestamp,
                    deviceType: isTouch ? 'mobile' : 'desktop',
                })
                setNotificationRouteInfo({
                    notificationUrlPathname: url.pathname,
                    notificationUrlSearch: url.search,
                    notificationClickedTimestamp: currentUser.notificationClickedTimestamp,
                    spaceId: currentUser.spaceId,
                    channelId: currentUser.channelId,
                    threadId: currentUser.threadId,
                    hasVisitedUrl: currentUser.hasVisitedUrl,
                })
            }
        }

        // hnt-5685: Workaround for touch devices to navigate to the initial link
        // when the app is opened as a new window from a notification tap
        getUrlFromNotificationCurrentUser()
    }, [
        currentUser?.notificationUrl,
        currentUser?.notificationClickedTimestamp,
        isTouch,
        location.pathname,
        location.search,
        currentUser?.hasVisitedUrl,
        currentUser?.spaceId,
        currentUser?.channelId,
        currentUser?.threadId,
    ])

    return notificationRouteInfo
}
