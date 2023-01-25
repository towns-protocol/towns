import React, { useCallback, useEffect, useMemo } from 'react'

import { useNavigate } from 'react-router'
import { Membership, SpaceData, useZionClient } from 'use-zion-client'
import { TimelineShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Button, Paragraph, Stack } from '@ui'
import { PATHS } from 'routes'
import { useRetryUntilResolved } from 'hooks/useRetryUntilResolved'
import { SpaceJoin } from '@components/Web3/SpaceJoin'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { LiquidContainer } from './SpacesIndex'

export const SpaceHome = () => {
    const { serverSpace: space, chainSpace } = useContractAndServerSpaceData()
    const spaceId = space?.id
    const navigate = useNavigate()
    const channels = useMemo(
        () => space?.channelGroups.flatMap((g) => g.channels),
        [space?.channelGroups],
    )

    // TODO: maybe there is a better way to do this, but I couldn't find a way that ensures channels are fully synced for a space before doing something. Tried initialSyncCompelete, roomInitialSync
    // this is a last resort to make sure we have channels available that we can route to on space load
    // primarily this only happens in 2 situations:
    // 1. immediately after logging in, and then getting redirected to a space (the default space)
    // 2. on first load AND already logged in, AND on a route that does not exist
    const hasSyncedChannels = useRetryUntilResolved(
        () => {
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

    // TODO: check how the default space fulfills this condition
    if (space && space.membership !== Membership.Join) {
        return (
            <Container>
                <JoinDefaultSpace space={space} />
            </Container>
        )
    }

    // space is on chain, but user has no matrix data, indicating they have landed via an invite link
    if (chainSpace && !space) {
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

const JoinDefaultSpace = (props: { space: SpaceData }) => {
    const { space } = props
    const { joinRoom } = useZionClient()
    const joinSpace = useCallback(() => {
        if (space.id) {
            joinRoom(space.id)
        }
    }, [joinRoom, space.id])

    return (
        <Box centerContent absoluteFill>
            <Button tone="cta1" animate={false} onClick={joinSpace}>
                Join <Paragraph strong>{space.name}</Paragraph>
            </Button>
        </Box>
    )
}

export default SpaceHome
