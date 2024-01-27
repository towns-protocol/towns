import React, { useEffect, useMemo } from 'react'
import { Outlet } from 'react-router'
import { Membership, useZionContext } from 'use-zion-client'
import { Box } from '@ui'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { SetUsernameForm } from '@components/SetUsernameForm/SetUsernameForm'
import { useUsernameConfirmed } from 'hooks/useUsernameConfirmed'
import { PublicTownPage, TownNotFoundBox } from './PublicTownPage'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const ValidateMembership = () => {
    const { serverSpace: space, chainSpace, chainSpaceLoading } = useContractAndServerSpaceData()
    const { spaces, clientStatus } = useZionContext()
    const spaceId = useSpaceIdFromPathname()
    const { confirmed: usernameConfirmed } = useUsernameConfirmed()
    const riverSpace = useMemo(() => spaces.find((s) => s.id === spaceId), [spaceId, spaces])

    useEffect(() => {
        console.log('ValidateMembership', spaceId, { chainSpaceLoading })
    }, [chainSpaceLoading, spaceId])

    if (!clientStatus.isRemoteDataLoaded || !clientStatus.isLocalDataLoaded) {
        return (
            <WelcomeLayout
                showProgress={clientStatus.isLocalDataLoaded ? clientStatus.progress : undefined}
            />
        )
    }

    if (!spaceId) {
        return <Outlet />
    }

    if (chainSpaceLoading) {
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

    if (space && !space.isLoadingMemberships && !isMember) {
        return <PublicTownPage />
    }

    return (
        <>
            <Outlet />
            {space && !usernameConfirmed && <SetUsernameForm spaceData={space} />}
        </>
    )
}
