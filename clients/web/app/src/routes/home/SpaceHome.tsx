import React, { useEffect, useMemo } from 'react'

import { matchPath, useNavigate } from 'react-router'
import { Membership, useConnectivity, useSpaceData, useTownsContext } from 'use-towns-client'
import { useSearchParams } from 'react-router-dom'
import { PATHS } from 'routes'
import { useStore } from 'store/store'

export const SpaceHome = () => {
    const space = useSpaceData()
    const { isAuthenticated, loggedInWalletAddress, loginStatus } = useConnectivity()
    const { signerContext } = useTownsContext()
    const spaceId = space?.id
    const navigate = useNavigate()
    const channels = useMemo(
        () => space?.channelGroups.flatMap((g) => g.channels),
        [space?.channelGroups],
    )

    let bookmarkedRoute = useStore((s) => (spaceId ? s.townRouteBookmarks[spaceId] : undefined))

    // verify the stored route matches the current URL scheme
    bookmarkedRoute = matchPath(`${PATHS.SPACES}/${space?.id}/*`, bookmarkedRoute ?? '')
        ? bookmarkedRoute
        : undefined

    const [searchParams] = useSearchParams()
    const trackSource = searchParams.get('track_source') ?? ''
    useEffect(() => {
        console.warn('[SpaceHome][push_hnt-5685]', 'route', {
            bookmarkedRoute,
            trackSource,
            spaceId: space?.id ?? '',
            isAuthenticated,
            loggedInWalletAddress: loggedInWalletAddress ?? '',
            loginStatus,
            hasSignerContext: signerContext !== undefined,
            locationPath: location.pathname,
            locationParams: location.search,
        })
    }, [
        bookmarkedRoute,
        isAuthenticated,
        loggedInWalletAddress,
        loginStatus,
        signerContext,
        space?.id,
        trackSource,
    ])

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
