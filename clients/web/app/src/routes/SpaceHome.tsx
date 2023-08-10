import React, { useEffect, useMemo } from 'react'

import { matchPath, useLocation, useNavigate } from 'react-router'
import { Membership } from 'use-zion-client'
import { TimelineShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Icon, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import { SpaceJoin } from '@components/Web3/SpaceJoin'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { useStore } from 'store/store'
import { useDevice } from 'hooks/useDevice'
import { LiquidContainer } from './SpacesIndex'

export const SpaceHome = () => {
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const location = useLocation()
    const { isTouch } = useDevice()
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

            // redirect user to the home view on mobile
            if (isTouch) {
                route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.HOME}`
            }
            // if channels haven't resolved OR if there are truly no channels
            else if (!firstChannelId) {
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
    }, [navigate, space, spaceId?.slug, channels, isTouch])

    // space doesn't exist
    if (!chainSpaceLoading && !chainSpace && !space) {
        return (
            <Box absoluteFill centerContent gap="lg">
                <Icon color="error" type="alert" size="square_xl" />
                <Text size="lg">Town not found</Text>
            </Box>
        )
    }

    // space is on chain, but user has no matrix data, indicating they have landed via an invite link
    // we could wrap in initialSyncComplete check also, but skipping for now because the modal will show a "connecting"
    // and that's probably useful for debugging this screen
    if (location.search.includes('invite') && !chainSpaceLoading && chainSpace && !space) {
        const joinData = {
            name: chainSpace.name,
            networkId: chainSpace.networkId,
            spaceAddress: chainSpace.address,
        }
        return (
            <Container>
                <SpaceJoin joinData={joinData} />
                <TimelineShimmer />
            </Container>
        )
    }

    return <></>
}

const Container = (props: { children: React.ReactNode }) => {
    return (
        <Stack horizontal grow justifyContent="center" basis="1200">
            <LiquidContainer fullbleed position="relative">
                {props.children}
            </LiquidContainer>
        </Stack>
    )
}

export default SpaceHome
