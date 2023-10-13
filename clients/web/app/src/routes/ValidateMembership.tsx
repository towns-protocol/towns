import React from 'react'
import { Outlet } from 'react-router'
import { Membership } from 'use-zion-client'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { Box, Icon, Paragraph, Text } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { PublicTownPage } from './PublicTownPage'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const ValidateMembership = () => {
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const initialSyncComplete = useWaitForInitialSync()
    const spaceId = useSpaceIdFromPathname()

    if (!spaceId) {
        return <Outlet />
    }

    if (chainSpaceLoading || !chainSpace || !initialSyncComplete) {
        return (
            <WelcomeLayout>
                <Box padding position="bottomRight">
                    <Paragraph>Debug: ValideMembership - loading town data</Paragraph>
                </Box>
            </WelcomeLayout>
        )
    }

    if (!chainSpace && !space) {
        return (
            <Box absoluteFill centerContent gap="lg">
                <Icon color="error" type="alert" size="square_xl" />
                <Text size="lg">Town not found</Text>
            </Box>
        )
    }

    const isMember = space?.membership === Membership.Join

    if (!chainSpace || !isMember) {
        return <PublicTownPage />
    }

    return <Outlet />
}
