import React from 'react'
import { Outlet } from 'react-router'
import { Membership } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { Box, Button, Heading, Icon, Paragraph } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { FadeInBox } from '@components/Transitions'
import { PublicTownPage } from './PublicTownPage'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const ValidateMembership = () => {
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const initialSyncComplete = useWaitForInitialSync()
    const spaceId = useSpaceIdFromPathname()

    if (!spaceId) {
        return <Outlet />
    }

    if (chainSpaceLoading || !initialSyncComplete) {
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
            <Box absoluteFill centerContent>
                <FadeInBox centerContent gap="lg" maxWidth="400">
                    <Box padding background="error" borderRadius="sm">
                        <Icon color="default" type="alert" size="square_md" />
                    </Box>
                    <Heading level={3}>Town not found</Heading>
                    <Paragraph color="gray2" textAlign="center">
                        The town is currently unreachable, please try again later.
                    </Paragraph>
                    <Box>
                        <Link to="/">
                            <Button size="button_md">Back to index</Button>
                        </Link>
                    </Box>
                </FadeInBox>
            </Box>
        )
    }

    const isMember = space?.membership === Membership.Join

    if (!chainSpace || !isMember) {
        return <PublicTownPage />
    }

    return <Outlet />
}
