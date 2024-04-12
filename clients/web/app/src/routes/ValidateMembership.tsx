import React, { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Membership, useOfflineStore, useSpaceData, useTownsContext } from 'use-towns-client'
import AnalyticsService, { AnalyticsEvents } from 'use-towns-client/dist/utils/analyticsService'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { SetUsernameForm } from '@components/SetUsernameForm/SetUsernameForm'
import { useUsernameConfirmed } from 'hooks/useUsernameConfirmed'
import { PublicTownPage } from './PublicTownPage/PublicTownPage'
import { AppSkeletonView } from './layouts/WelcomeLayout'

export const ValidateMembership = () => {
    const space = useSpaceData()
    const { client, clientStatus } = useTownsContext()
    const spaceIdFromPathname = useSpaceIdFromPathname()
    const { confirmed: usernameConfirmed } = useUsernameConfirmed()

    const offlineSyncedSpaceIds = useOfflineStore((s) => s.offlineSyncedSpaceIds)

    useEffect(() => {
        console.log('ValidateMembership', spaceIdFromPathname, {
            usernameConfirmed,
            clientStatus,
            client: client !== undefined,
        })
    }, [client, clientStatus, spaceIdFromPathname, usernameConfirmed])

    if (!spaceIdFromPathname) {
        return <Outlet />
    }

    // space can take some time to sync on load
    if (!client || space === undefined) {
        if (offlineSyncedSpaceIds.includes(spaceIdFromPathname)) {
            // we can for now assume the user is a member
            return <AppSkeletonView />
        } else {
            // not sure if they're a member yet
            // while the space loads, show the public town page
            AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
            return <PublicTownPage />
        }
    }

    // if you are logged in and a member, it might need some time to get your membership status
    if (!space.hasLoadedMemberships) {
        return <AppSkeletonView />
    }

    const isMember = space.membership === Membership.Join

    if (!isMember) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
        return <PublicTownPage />
    }

    AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.IsMember)

    if (!clientStatus.isRemoteDataLoaded || !clientStatus.isLocalDataLoaded) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.WelcomeLayoutLoadLocalData)
        return (
            <AppSkeletonView
                progress={clientStatus.isLocalDataLoaded ? clientStatus.progress : undefined}
            />
        )
    }

    return (
        <>
            <Outlet />
            {!usernameConfirmed && <SetUsernameForm spaceData={space} />}
        </>
    )
}
