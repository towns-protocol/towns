import React, { useCallback, useEffect } from 'react'

import { useNavigate } from 'react-router'
import { Membership, SpaceData, useSpaceData, useSpaceId, useZionClient } from 'use-zion-client'
import { TimelineShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Button, Paragraph, Stack } from '@ui'
import { LiquidContainer } from './SpacesIndex'

export const SpaceHome = () => {
    const spaceId = useSpaceId()
    const space = useSpaceData()
    const navigate = useNavigate()

    useEffect(() => {
        const channels = space?.channelGroups.flatMap((g) => g.channels)

        const firstChannelId = channels?.at(0)?.id
        if (firstChannelId && space?.membership === Membership.Join) {
            const timeout = setTimeout(() => {
                navigate(`/spaces/${spaceId?.slug}/channels/${firstChannelId.slug}/`)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [navigate, space?.channelGroups, space?.membership, spaceId?.slug])

    if (!spaceId || !space) {
        return null
    }

    return (
        <Stack horizontal grow justifyContent="center" basis="1200">
            <LiquidContainer fullbleed position="relative">
                {!space.membership || Math.random() > 0 ? (
                    <Box absoluteFill padding grow overflow="hidden">
                        <TimelineShimmer />
                    </Box>
                ) : space.membership !== Membership.Join ? (
                    <JoinSpace space={space} />
                ) : (
                    <>Redirect...</>
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
