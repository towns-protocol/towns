import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
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
            setTouchInitialLink(undefined)
            if (currentUser?.lastUrlTimestamp) {
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

    return touchInitialLink
}
