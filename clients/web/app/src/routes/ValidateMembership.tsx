import React, { useEffect, useMemo } from 'react'
import { Outlet } from 'react-router'
import { Membership, useSpaceData, useZionContext } from 'use-zion-client'
import { Box } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { PublicTownPage, TownNotFoundBox } from './PublicTownPage'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const ValidateMembership = () => {
    const space = useSpaceData()
    const { spaces } = useZionContext()
    const initialSyncComplete = useWaitForInitialSync()
    const spaceId = useSpaceIdFromPathname()

    const riverSpace = useMemo(
        () => spaces.find((s) => s.id.networkId === spaceId),
        [spaceId, spaces],
    )

    useEffect(() => {
        console.log('ValidateMembership', spaceId, { initialSyncComplete })
    }, [spaceId, initialSyncComplete])

    if (!spaceId) {
        return <Outlet />
    }

    if (!initialSyncComplete) {
        return riverSpace ? (
            <Outlet />
        ) : (
            <WelcomeLayout debugText="validate membership: loading town data" />
        )
    }

    if (!space) {
        return (
            <Box absoluteFill centerContent>
                <TownNotFoundBox />
            </Box>
        )
    }

    const isMember = space?.membership === Membership.Join

    if (!isMember) {
        return <PublicTownPage />
    }

    return <Outlet />
}
