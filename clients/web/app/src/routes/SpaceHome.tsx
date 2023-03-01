import React, { useEffect, useMemo } from 'react'

import { Navigate, useLocation, useNavigate } from 'react-router'
import { Membership } from 'use-zion-client'
import { TimelineShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Stack } from '@ui'
import { PATHS } from 'routes'
import { useRetryUntilResolved } from 'hooks/useRetryUntilResolved'
import { SpaceJoin } from '@components/Web3/SpaceJoin'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { LiquidContainer } from './SpacesIndex'

export const SpaceHome = () => {
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const location = useLocation()
    const initialSyncComplete = useWaitForInitialSync()

    const spaceId = space?.id
    const navigate = useNavigate()
    const channels = useMemo(
        () => space?.channelGroups.flatMap((g) => g.channels),
        [space?.channelGroups],
    )

    // TODO: maybe there is a better way to do this, but I couldn't find a way that ensures channels are fully synced for a space before doing something. initialSyncComplete isn't enough to know that channels are synced.
    // this is a last resort to make sure we have channels available that we can route to on space load
    // primarily this happens when loading the app directly with a space link
    const hasSyncedChannels = useRetryUntilResolved(
        () => {
            if (!initialSyncComplete) {
                return false
            }
            return Boolean(channels?.at(0)?.id)
        },
        100,
        3000,
    )

    useEffect(() => {
        if (!hasSyncedChannels) {
            return
        }

        if (space?.membership === Membership.Join) {
            let route: string
            const firstChannelId = channels?.at(0)?.id

            // if channels haven't resolved OR if there are truly no channels
            if (!firstChannelId) {
                // the worst case is that user is navigated to the threads page,
                // and has to click on a channel once it loads in
                // TODO: probably we should have replace this with "Space Home" or something when that is implemented/designed
                route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.THREADS}`
            } else {
                route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.CHANNELS}/${firstChannelId.slug}/`
            }

            const timeout = setTimeout(() => {
                navigate(route, { replace: true })
            }, 500)

            return () => {
                clearTimeout(timeout)
            }
        }
    }, [
        navigate,
        space?.membership,
        space?.channelGroups,
        spaceId?.slug,
        channels,
        hasSyncedChannels,
    ])

    // space doesn't exist
    if (!chainSpaceLoading && !chainSpace && !space) {
        return <Navigate to="/" />
    }

    // space is on chain, but user has no matrix data, indicating they have landed via an invite link
    // we could wrap in initialSyncComplete check also, but skipping for now because the modal will show a "connecting"
    // and that's probably useful for debugging this screen
    if (location.search.includes('invite') && !chainSpaceLoading && chainSpace && !space) {
        const joinData = {
            name: chainSpace.name,
            networkId: chainSpace.networkId,
        }
        return (
            <Container>
                <SpaceJoin joinData={joinData} />
                <TimelineShimmer />
            </Container>
        )
    }

    return (
        <Container>
            <Box absoluteFill padding grow overflow="hidden">
                <TimelineShimmer />
            </Box>
        </Container>
    )
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
