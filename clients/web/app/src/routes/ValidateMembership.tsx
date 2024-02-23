import React, { useEffect, useMemo } from 'react'
import { Outlet } from 'react-router'
import { Membership, useZionContext } from 'use-zion-client'
import AnalyticsService, { AnalyticsEvents } from 'use-zion-client/dist/utils/analyticsService'
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
    const spaceIdFromPathname = useSpaceIdFromPathname()
    const { confirmed: usernameConfirmed } = useUsernameConfirmed()
    const riverSpace = useMemo(
        () => spaces.find((s) => s.id === spaceIdFromPathname),
        [spaceIdFromPathname, spaces],
    )
    const isMember = space?.membership === Membership.Join

    if (isMember) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.IsMember)
    }

    useEffect(() => {
        console.log('ValidateMembership', spaceIdFromPathname, { chainSpaceLoading })
    }, [chainSpaceLoading, spaceIdFromPathname])

    if (!clientStatus.isRemoteDataLoaded || !clientStatus.isLocalDataLoaded) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.WelcomeLayoutLoadLocalData)
        return (
            <WelcomeLayout
                debugText="validate membership: loading local data"
                showProgress={clientStatus.isLocalDataLoaded ? clientStatus.progress : undefined}
            />
        )
    }

    if (!spaceIdFromPathname) {
        return <Outlet />
    }

    // when you navigate to another town, after the first town is loaded,
    // we can show the river space while the chainSpace is loading
    if (chainSpaceLoading) {
        return riverSpace ? (
            <Outlet />
        ) : (
            <WelcomeLayout debugText="validate membership: loading blockchain space data" />
        )
    }

    // TODO: if we persist react-query data, this will pass even if node provider is down
    if (!chainSpace) {
        return (
            <Box absoluteFill centerContent>
                <TownNotFoundBox />
            </Box>
        )
    }

    // space will always be undefined if you are logged out or not a member
    // but if you are logged in and a member, it might need some time to get your membership status
    if (space && !space.hasLoadedMemberships) {
        return <WelcomeLayout debugText="validate membership: loading river memberships" />
    }

    if (!isMember) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
        return <PublicTownPage />
    }

    return (
        <>
            <Outlet />
            {space && !usernameConfirmed && <SetUsernameForm spaceData={space} />}
        </>
    )
}
