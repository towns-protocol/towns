import React, { useCallback, useEffect } from 'react'

import { useNavigate } from 'react-router'
import {
    Membership,
    SpaceData,
    useMyMembership,
    useSpaceData,
    useZionClient,
} from 'use-zion-client'
import { TimelineShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Button, Paragraph, Stack } from '@ui'
import { PATHS } from 'routes'
import { useIsSpaceOwner } from 'hooks/useIsSpaceOwner'
import { LiquidContainer } from './SpacesIndex'

export const SpaceHome = () => {
    const space = useSpaceData()
    const spaceId = space?.id
    const navigate = useNavigate()
    const membership = useMyMembership(space?.id)
    const { data: isOwner, isLoading } = useIsSpaceOwner()

    useEffect(() => {
        const channels = space?.channelGroups.flatMap((g) => g.channels)

        if (membership === Membership.Join) {
            let route: string
            const firstChannelId = channels?.at(0)?.id

            if (!firstChannelId) {
                if (isLoading) {
                    return
                }

                if (isOwner) {
                    route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.GETTING_STARTED}`
                } else {
                    route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.THREADS}`
                }
            } else {
                route = `/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.CHANNELS}/${firstChannelId.slug}/`
            }

            const timeout = setTimeout(() => {
                navigate(route)
            }, 500)

            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isOwner, isLoading, navigate, space?.channelGroups, membership, spaceId?.slug])

    if (!spaceId || !space) {
        return null
    }

    return (
        <Stack horizontal grow justifyContent="center" basis="1200">
            <LiquidContainer fullbleed position="relative">
                {membership !== Membership.Join ? (
                    <JoinSpace space={space} />
                ) : (
                    <Box absoluteFill padding grow overflow="hidden">
                        <TimelineShimmer />
                    </Box>
                )}
            </LiquidContainer>
        </Stack>
    )
}

const JoinSpace = (props: { space: SpaceData }) => {
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
