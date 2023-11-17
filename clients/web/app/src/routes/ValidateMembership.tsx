import React from 'react'
import { Outlet } from 'react-router'
import { Membership } from 'use-zion-client'
import { Box } from '@ui'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { PublicTownPage, TownNotFoundBox } from './PublicTownPage'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const ValidateMembership = () => {
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const initialSyncComplete = useWaitForInitialSync()
    const spaceId = useSpaceIdFromPathname()

    if (!spaceId) {
        return <Outlet />
    }

    if (chainSpaceLoading || !initialSyncComplete) {
        return <WelcomeLayout debugText="validate membership: loading town data" />
    }

    if (!chainSpace && !space) {
        return (
            <Box absoluteFill centerContent>
                <TownNotFoundBox />
            </Box>
        )
    }

    const isMember = space?.membership === Membership.Join

    if (!chainSpace || !isMember) {
        return <PublicTownPage />
    }

    return <Outlet />
}
