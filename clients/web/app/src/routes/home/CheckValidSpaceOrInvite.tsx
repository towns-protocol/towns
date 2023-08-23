import React from 'react'
import { Membership } from 'use-zion-client'
import { useLocation } from 'react-router'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { Box, Icon, Stack, Text } from '@ui'
import { LiquidContainer } from 'routes/SpacesIndex'
import { SpaceJoin } from '@components/Web3/SpaceJoin'
import { TimelineShimmer } from '@components/Shimmer'
import { useDevice } from 'hooks/useDevice'

export function CheckValidSpaceOrInvite({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const { isTouch } = useDevice()

    if (chainSpaceLoading) {
        // this should probably be home screen shimmer
        return isTouch ? <TimelineShimmer /> : <></>
    }

    // space doesn't exist
    if (!chainSpace && !space) {
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
    const notAMember = space?.membership !== Membership.Join

    if (location.search.includes('invite') && chainSpace && notAMember) {
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

    return children
}

function Container(props: { children: React.ReactNode }) {
    return (
        <Stack horizontal grow justifyContent="center" basis="1200">
            <LiquidContainer fullbleed position="relative">
                {props.children}
            </LiquidContainer>
        </Stack>
    )
}
