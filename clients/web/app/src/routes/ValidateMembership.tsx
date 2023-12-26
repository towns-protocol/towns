import React, { useEffect, useMemo } from 'react'
import { Outlet } from 'react-router'
import { Membership, useZionContext } from 'use-zion-client'
import { Box } from '@ui'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { SetUsernameForm } from '@components/SetUsernameForm/SetUsernameForm'
import { useUsernameConfirmed } from 'hooks/useUsernameConfirmed'
import { PublicTownPage, TownNotFoundBox } from './PublicTownPage'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const ValidateMembership = () => {
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const { spaces } = useZionContext()
    const initialSyncComplete = useWaitForInitialSync()
    const spaceId = useSpaceIdFromPathname()
    const { confirmed: usernameConfirmed } = useUsernameConfirmed()

    const riverSpace = useMemo(() => spaces.find((s) => s.id === spaceId), [spaceId, spaces])

    useEffect(() => {
        console.log('ValidateMembership', spaceId, { chainSpaceLoading, initialSyncComplete })
    }, [chainSpaceLoading, spaceId, initialSyncComplete])

    if (!spaceId) {
        return <Outlet />
    }

    if (chainSpaceLoading || !initialSyncComplete) {
        return riverSpace ? (
            <Outlet />
        ) : (
            <WelcomeLayout debugText="validate membership: loading town data" />
        )
    }

    if (!chainSpace && !space) {
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

    return (
        <>
            <Outlet />
            {!usernameConfirmed && <SetUsernameForm spaceData={space} />}
        </>
    )
}
