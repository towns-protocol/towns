import React, { useEffect, useMemo } from 'react'

import { matchPath, useNavigate } from 'react-router'
import { Membership, useConnectivity, useSpaceData } from 'use-towns-client'
import { useSearchParams } from 'react-router-dom'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useDevice } from 'hooks/useDevice'
import { replaceOAuthParameters, useAnalytics } from 'hooks/useAnalytics'
import { LINKED_RESOURCE } from '../../data/rel'

export const SpaceHome = () => {
    const space = useSpaceData()
    const { isTouch } = useDevice()
    const { loginStatus } = useConnectivity()
    const spaceId = space?.id
    const navigate = useNavigate()
    const { analytics } = useAnalytics()
    const channels = useMemo(
        () => space?.channelGroups.flatMap((g) => g.channels),
        [space?.channelGroups],
    )

    const { bookmarkedRoute, storeBookmarkedSpaceId, storeBookmarkedRoute } = useStore((s) => {
        const storeBookmarkedSpaceId = s.spaceIdBookmark
        const storeBookmarkedRoute = storeBookmarkedSpaceId
            ? s.townRouteBookmarks[storeBookmarkedSpaceId]
            : undefined
        let bookmarkedRoute = spaceId ? s.townRouteBookmarks[spaceId] : undefined
        // verify the stored route matches the current URL scheme
        bookmarkedRoute = matchPath(`${PATHS.SPACES}/${spaceId}/*`, bookmarkedRoute ?? '')
            ? bookmarkedRoute
            : undefined
        return {
            bookmarkedRoute,
            storeBookmarkedSpaceId,
            storeBookmarkedRoute,
        }
    })

    const [searchParams] = useSearchParams()
    const rel = useMemo(() => {
        return searchParams.get(LINKED_RESOURCE) ?? ''
    }, [searchParams])

    useEffect(() => {
        console.log('[SpaceHome][route]', 'route', {
            locationPath: location.pathname,
            bookmarkedRoute,
            storeBookmarkedRoute: storeBookmarkedRoute ?? 'undefined',
            spaceId: space?.id ?? '',
            storeBookmarkedSpaceId: storeBookmarkedSpaceId ?? 'undefined',
            rel,
            loginStatus,
            locationParams: location.search,
            deviceType: isTouch ? 'mobile' : 'desktop',
        })
    }, [
        bookmarkedRoute,
        loginStatus,
        space?.id,
        rel,
        isTouch,
        storeBookmarkedSpaceId,
        storeBookmarkedRoute,
    ])

    useEffect(() => {
        analytics?.page(
            'home-page',
            'home page',
            {
                path: `${PATHS.SPACES}/${spaceId}`,
                spaceId,
                locationPathname: location.pathname,
                locationSearch: replaceOAuthParameters(location.search),
                anonymousId: analytics.anonymousId,
            },
            () => {
                console.log('[analytics] home page')
            },
        )
    }, [analytics, spaceId])

    useEffect(() => {
        // TODO: this hijacks invite routes if you leave and then rejoin a space with an invite link.
        // We should unset all bookmarks for a space/channel when you leave it.
        // For now just ignore invites
        if (location.search.includes('invite')) {
            return
        }
        // if we have a bookmarked route (e.g. channel or thread), instead of
        // waiting for the channels to load to guess the first channel, we
        // assume we have access to the route and optimistically navigate to it.
        // if the route fails, we'll delete the bookmark and start over
        if (bookmarkedRoute) {
            navigate(bookmarkedRoute, { replace: true })
        }
    }, [bookmarkedRoute, navigate, space?.isLoadingChannels])

    useEffect(() => {
        if (space?.isLoadingChannels) {
            return
        }

        if (space?.membership === Membership.Join) {
            let route: string
            const firstChannelId = channels?.at(0)?.id

            if (!firstChannelId) {
                // the worst case is that user is navigated to the threads page,
                // and has to click on a channel once it loads in
                // TODO: probably we should have replace this with "Space Home" or something when that is implemented/designed
                route = `/${PATHS.SPACES}/${spaceId}/${PATHS.THREADS}/`
            } else {
                route = `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${firstChannelId}/`
            }

            const timeout = setTimeout(() => {
                navigate(route, { replace: true })
            }, 1000)

            return () => {
                clearTimeout(timeout)
            }
        }
    }, [navigate, space, spaceId, channels])

    return <>{/* don't need to render anything, redirects above take user elsewhere */}</>
}

export default SpaceHome
