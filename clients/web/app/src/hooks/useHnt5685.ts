import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { NotificationCurrentUser } from 'store/notificationCurrentUser'
import { SECOND_MS } from 'data/constants'
import { useDevice } from './useDevice'

export interface PathInfo {
    pathname: string
    search: string
}

// https://linear.app/hnt-labs/issue/HNT-5685/notifications-for-mobile-pwa-arent-deep-linking-for-me-when-the-app-is
export function useHnt5685() {
    const [notificationCurrentUser] = useState<NotificationCurrentUser>(
        new NotificationCurrentUser(),
    )
    const [touchInitialLink, setTouchInitialLink] = useState<PathInfo | undefined>(undefined)
    const { isTouch } = useDevice()
    const location = useLocation()
    const navigate = useNavigate()

    const shouldNavigateToBookmark = useMemo(() => {
        return isTouch && touchInitialLink !== undefined
    }, [isTouch, touchInitialLink])

    const navigateAndResetTouchLink = useCallback(
        (pathname: string) => {
            if (shouldNavigateToBookmark) {
                navigate(pathname)
                setTouchInitialLink(undefined)
            }
        },
        [navigate, shouldNavigateToBookmark],
    )

    const currentUser = useLiveQuery(async () => {
        if (notificationCurrentUser) {
            const cu = await notificationCurrentUser.getCurrentUserRecord()
            return cu
        }
    }, [])

    useEffect(() => {
        const getUrlFromNotificationCurrentUser = async (): Promise<void> => {
            setTouchInitialLink(undefined)
            // trigger a re-render when the lastUrlTimestamp is updated
            // and within the last t seconds
            const timeNow = Date.now()
            const cutOffTime = timeNow - 3 * SECOND_MS
            if (currentUser?.lastUrlTimestamp && currentUser?.lastUrlTimestamp > cutOffTime) {
                // return the last URL only if it was set within the last t seconds
                // to workaround hnt-5685
                const urlFromNotification = currentUser?.lastUrl
                if (urlFromNotification) {
                    const url = new URL(urlFromNotification, window.location.origin)
                    console.warn('[useHnt5685][hnt-5685] setTouchInitialLink', 'route', {
                        locationPathname: location.pathname,
                        locationSearch: location.search,
                        storeUrlPathname: url.pathname,
                        storeUrlSearch: url.search,
                        timeNow,
                        isWithinCutOffTime: currentUser.lastUrlTimestamp > cutOffTime,
                        lastUrlTimestamp: currentUser.lastUrlTimestamp,
                        deviceType: isTouch ? 'mobile' : 'desktop',
                    })
                    setTouchInitialLink({
                        pathname: url.pathname,
                        search: url.search,
                    })
                }
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

    return useMemo(() => {
        return {
            touchInitialLink,
            navigateAndResetTouchLink,
            shouldNavigateToBookmark,
        }
    }, [navigateAndResetTouchLink, shouldNavigateToBookmark, touchInitialLink])
}
