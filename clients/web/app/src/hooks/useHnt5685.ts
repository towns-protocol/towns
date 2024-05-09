import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { NotificationCurrentUser } from 'store/notificationCurrentUser'
import { SECOND_MS } from 'data/constants'
import { useDevice } from './useDevice'

export interface PathInfo {
    pathname: string
    search: string
}

export function useHnt5685() {
    const [notificationCurrentUser] = useState<NotificationCurrentUser>(
        new NotificationCurrentUser(),
    )
    const [touchInitialLink, setTouchInitialLink] = useState<PathInfo | undefined>(undefined)
    const { isTouch } = useDevice()
    const location = useLocation()

    useEffect(() => {
        const getUrlFromNotificationCurrentUser = async (
            notificationCurrentUser: NotificationCurrentUser,
        ): Promise<void> => {
            setTouchInitialLink(undefined)
            const currentUser = await notificationCurrentUser.getCurrentUserRecord()
            if (currentUser?.lastUrlTimestamp) {
                const currentTime = Date.now()
                const timeDiff = currentTime - currentUser.lastUrlTimestamp
                if (timeDiff < 5 * SECOND_MS) {
                    // return the last URL only if it was set within the last t seconds
                    // to workaround hnt-5685
                    const urlFromNotification = currentUser?.lastUrl
                    if (urlFromNotification) {
                        const url = new URL(urlFromNotification, window.location.origin)
                        console.warn('[useHnt5685][hnt-5685] setTouchInitialLink', 'route', {
                            isTouch,
                            locationPathname: location.pathname,
                            locationSearch: location.search,
                            storeUrlPathname: url.pathname,
                            storeUrlSearch: url.search,
                            timeDiff,
                            currentTime,
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
        }
        // hnt-5685: Workaround for touch devices to navigate to the initial link
        // when the app is opened as a new window from a notification tap
        if (isTouch && location.pathname === '/') {
            // try to get the URL from the notification CurrentUser store
            getUrlFromNotificationCurrentUser(notificationCurrentUser)
        }
    }, [isTouch, location.pathname, location.search, notificationCurrentUser])

    return touchInitialLink
}
