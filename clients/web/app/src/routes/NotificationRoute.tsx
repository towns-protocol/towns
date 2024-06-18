import { useEffect, useMemo, useRef, useState } from 'react'
import { useTimelineThread, useTownsContext } from 'use-towns-client'

import { createSearchParams } from 'react-router-dom'
import { dlogger } from '@river-build/dlog'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { NotificationCurrentUser } from 'store/notificationCurrentUser'
import { PanelStack } from '@components/Panel/PanelContext'
import { SECOND_MS } from 'data/constants'
import { useDevice } from 'hooks/useDevice'
import { useNotificationRoute } from 'hooks/useNotificationRoute'

const log = dlogger('[route][push]app:NotificationRoute')
const FRESHNESS_THRESHOLD = 5 * SECOND_MS

/**
 * the notification router is responsible for navigating to the correct url when
 * the user clicks on a notification.
 * it does this in three phases:
 * 1. check if the notification is fresh. if not, do nothing. as part of this
 * phase, it will extract all the metadata like the spaceId, channelId, threadId.
 * 2. check if the required path params are present. if not, do nothing.
 * 3. navigate to the url if it is safe to do so.
 */
export function NotificationRoute(): JSX.Element | null {
    const [notificationCurrentUser] = useState<NotificationCurrentUser>(
        new NotificationCurrentUser(),
    )
    const { isTouch } = useDevice()
    const { spaces, spaceHierarchies, dmChannels } = useTownsContext()
    const { state: locationState } = useLocation()
    const { urlPathnameSafeToNavigate } = useNotificationRoute()
    const navigate = useNavigate()

    /** phase 1: check if the notification is fresh, and extract all the
     * metadata like the spaceId, channelId, threadId.
     */
    const currentUser = useLiveQuery(async () => {
        if (notificationCurrentUser) {
            // trigger a re-render when the notificationClickedTimestamp is updated
            // and within the last t seconds
            const timeDiff = Date.now() - FRESHNESS_THRESHOLD
            const cu = await notificationCurrentUser.currentUser
                .where('notificationClickedTimestamp')
                .above(timeDiff)
                .first()
            return cu
        }
    }, [])

    const { spaceId, channelId, threadId, isFresh, notificationUrl, hasVisitedUrl } =
        useMemo(() => {
            // notification clicked within the last t seconds
            const isFresh = Boolean(
                currentUser?.notificationClickedTimestamp &&
                    Date.now() - FRESHNESS_THRESHOLD < currentUser.notificationClickedTimestamp,
            )
            return {
                isFresh,
                channelId: currentUser?.channelId ?? '',
                hasVisitedUrl: currentUser?.hasVisitedUrl,
                notificationUrl: currentUser?.notificationUrl,
                spaceId: currentUser?.spaceId,
                threadId: currentUser?.threadId,
            }
        }, [
            currentUser?.channelId,
            currentUser?.hasVisitedUrl,
            currentUser?.notificationClickedTimestamp,
            currentUser?.notificationUrl,
            currentUser?.spaceId,
            currentUser?.threadId,
        ])

    /** phase 2: check if the required path params are present */
    const { parent: threadParent } = useTimelineThread(channelId, threadId)

    const isChannelIdPresent = useMemo((): boolean => {
        if (!spaceId || !channelId || !spaceHierarchies) {
            return false
        }
        const space = spaceHierarchies[spaceId]
        if (!space) {
            return false
        }
        return space.channels.some((channel) => channel.id === channelId)
    }, [channelId, spaceHierarchies, spaceId])

    const isDmChannelIdPresent = useMemo((): boolean => {
        if (!channelId || !dmChannels) {
            return false
        }
        return dmChannels.some((channel) => channel.id === channelId)
    }, [channelId, dmChannels])

    const isSpaceIdPresentOrUnspecified = useMemo((): boolean => {
        // either there is no spaceId requirement or the spaceId is in the list of spaces
        if (!spaceId) {
            // unspecified is ok for DM / GDM
            return true
        }
        return spaces && spaces.some((space) => space.id === spaceId)
    }, [spaceId, spaces])

    const isThreadIdPresentOrUnspecified = useMemo((): boolean => {
        if (!threadId) {
            // unspecified is ok
            return true
        }
        return threadParent !== undefined
    }, [threadId, threadParent])

    const isRequiredPathParamsPresent = useMemo((): boolean => {
        const isRequiredPresent =
            isFresh &&
            (isChannelIdPresent || isDmChannelIdPresent) &&
            isSpaceIdPresentOrUnspecified &&
            isThreadIdPresentOrUnspecified
        log.info('isRequiredPathParamsPresent', {
            isRequiredPathParamsPresent: isRequiredPresent,
            isFresh,
            isDmOrChannelIdPresent: isChannelIdPresent || isDmChannelIdPresent,
            isSpaceIdPresentOrUnspecified,
            isThreadIdPresentOrUnspecified,
        })
        return isRequiredPresent
    }, [
        isChannelIdPresent,
        isDmChannelIdPresent,
        isFresh,
        isSpaceIdPresentOrUnspecified,
        isThreadIdPresentOrUnspecified,
    ])

    /**
     * phase 3: create a safe url route for both touch and desktop, and
     * navigate to it
     */
    const urlSafeToNavigate = useMemo((): string | undefined => {
        if (isRequiredPathParamsPresent && notificationUrl) {
            return urlPathnameSafeToNavigate(notificationUrl, channelId)
        }
    }, [channelId, isRequiredPathParamsPresent, notificationUrl, urlPathnameSafeToNavigate])

    useEffect(() => {
        log.info('route', {
            channelId,
            hasVisitedUrl,
            isRequiredPathParamsPresent,
            locationState: locationState?.fromNotification,
            notificationUrl,
            spaceId,
            threadId,
            urlSafeToNavigate,
        })
    }, [
        channelId,
        hasVisitedUrl,
        locationState?.fromNotification,
        notificationUrl,
        urlSafeToNavigate,
        spaceId,
        threadId,
        isRequiredPathParamsPresent,
    ])

    const navigateTo = useEvent((to: string) => {
        if (isTouch && isDmChannelIdPresent) {
            const url = new URL(to, window.location.origin)
            const pathname = url.pathname
            const search = createSearchParams({
                ...url.searchParams,
                stackId: PanelStack.DIRECT_MESSAGES,
            }).toString()
            log.info('navigateTo', {
                pathname,
                search,
                isDmOrChannel: isDmChannelIdPresent ? 'dm/gdm' : 'channel',
                deviceType: isTouch ? 'mobile' : 'desktop',
            })
            navigate(
                {
                    pathname,
                    search: search,
                },
                {
                    state: { fromNotification: true },
                },
            )
        } else {
            log.info('navigateTo', {
                pathname: to,
                isDmOrChannel: isDmChannelIdPresent ? 'dm/gdm' : 'channel',
                deviceType: isTouch ? 'mobile' : 'desktop',
            })
            navigate(to, {
                state: { fromNotification: true },
            })
        }
    })

    const isNavigatingRef = useRef<boolean>(false)
    useEffect(() => {
        async function visitUrlIfFresh(): Promise<void> {
            if (isNavigatingRef.current) {
                return
            }
            // if the user has not visited the url
            // and this signal to navigate is coming from the broadcast
            // receiver, then visit the url
            if (!hasVisitedUrl && locationState?.fromNotification && urlSafeToNavigate) {
                isNavigatingRef.current = true
                await notificationCurrentUser.setVisitedUrl(true)
                navigateTo(urlSafeToNavigate)
                isNavigatingRef.current = false
            }
        }
        visitUrlIfFresh()
    }, [
        hasVisitedUrl,
        isDmChannelIdPresent,
        locationState?.fromNotification,
        navigateTo,
        notificationCurrentUser,
        urlSafeToNavigate,
    ])

    // no output to the dom
    return null
}
