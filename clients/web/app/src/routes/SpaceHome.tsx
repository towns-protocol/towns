import React, { useCallback, useEffect } from 'react'

import { useNavigate } from 'react-router'
import {
    Membership,
    SpaceData,
    useSpaceData,
    useSpaceFromContract,
    useSpaceId,
    useWeb3Context,
    useZionClient,
} from 'use-zion-client'
import { TimelineShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Button, Paragraph, Stack } from '@ui'
import { PATHS } from 'routes'
import { LiquidContainer } from './SpacesIndex'

export const SpaceHome = () => {
    const spaceId = useSpaceId()
    const space = useSpaceData()
    const { accounts } = useWeb3Context()
    const navigate = useNavigate()
    const wallet = accounts[0]
    const { isLoading: contractLoading, space: spaceContract } = useSpaceFromContract(space?.id)

    useEffect(() => {
        const channels = space?.channelGroups.flatMap((g) => g.channels)

        if (contractLoading) {
            return
        }
        const owner = wallet === spaceContract?.owner

        if (space?.membership === Membership.Join) {
            let route: string
            const firstChannelId = channels?.at(0)?.id

            if (!firstChannelId) {
                if (owner) {
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
    }, [
        navigate,
        space?.channelGroups,
        space?.membership,
        spaceId?.slug,
        contractLoading,
        spaceContract?.owner,
        wallet,
    ])

    if (!spaceId || !space) {
        return null
    }

    return (
        <Stack horizontal grow justifyContent="center" basis="1200">
            <LiquidContainer fullbleed position="relative">
                {space.membership !== Membership.Join ? (
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
