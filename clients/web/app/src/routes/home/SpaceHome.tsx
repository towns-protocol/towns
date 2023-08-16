import React, { useEffect, useMemo } from 'react'

import { matchPath, useNavigate } from 'react-router'
import { Membership, useSpaceData } from 'use-zion-client'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { CheckValidSpaceOrInvite } from './CheckValidSpaceOrInvite'

export const SpaceHome = () => {
    const space = useSpaceData()
    const spaceId = space?.id
    const navigate = useNavigate()
    const channels = useMemo(
        () => space?.channelGroups.flatMap((g) => g.channels),
        [space?.channelGroups],
    )

    let bookmarkedRoute = useStore((s) =>
        spaceId?.slug ? s.townRouteBookmarks[spaceId?.slug] : undefined,
    )

    // verify the stored route matches the current URL scheme
    bookmarkedRoute = matchPath(`${PATHS.SPACES}/${space?.id.slug}/*`, bookmarkedRoute ?? '')
        ? bookmarkedRoute
        : undefined

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
                route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.THREADS}/`
            } else {
                route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.CHANNELS}/${firstChannelId.slug}/`
            }

            const timeout = setTimeout(() => {
                navigate(route, { replace: true })
            }, 1000)

            return () => {
                clearTimeout(timeout)
            }
        }
    }, [navigate, space, spaceId?.slug, channels])

    return (
        <CheckValidSpaceOrInvite>
            {/* don't need to render anything, redirects above take user elsewhere */}
            <></>
        </CheckValidSpaceOrInvite>
    )
}

export default SpaceHome
