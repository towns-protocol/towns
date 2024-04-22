import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { Membership, useSpaceData, useSpaceDataStore, useTownsContext } from 'use-towns-client'
import AnalyticsService, { AnalyticsEvents } from 'use-towns-client/dist/utils/analyticsService'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { SetUsernameForm } from '@components/SetUsernameForm/SetUsernameForm'
import { useUsernameConfirmed } from 'hooks/useUsernameConfirmed'
import { PublicTownPage } from './PublicTownPage/PublicTownPage'
import { AppSkeletonView } from './layouts/WelcomeLayout'
import { usePublicPageLoginFlow } from './PublicTownPage/usePublicPageLoginFlow'

//  Aims to give the best experience to the most common user flow: a user who is a member of a space and loading the app.
//
//  Has ?join params
//    -> public town page
//
//  No ?join params
//    - if no `space` data?
//      - if loaded spaceDataMap && no data? -> public town page
//      - else -> AppSkeletonView
//   - if no membership? -> public town page
//   - if no cached data? -> AppSkeletonView
//   - else -> outlet

export const ValidateMembership = () => {
    const space = useSpaceData()
    const { client, clientStatus, signerContext } = useTownsContext()
    const spaceIdFromPathname = useSpaceIdFromPathname()
    const { confirmed: usernameConfirmed } = useUsernameConfirmed()
    const isJoining = !!usePublicPageLoginFlow().joiningSpace
    const [_PublicTownPage] = useState(<PublicTownPage />)
    const spaceDataMap = useSpaceDataStore((s) => s.spaceDataMap)

    useEffect(() => {
        console.log('ValidateMembership', spaceIdFromPathname, {
            usernameConfirmed,
            clientStatus,
            client: client !== undefined,
            isJoining,
            space: space !== undefined,
            spaceIdFromPathname,
            spaceDataMap,
            signerContext: signerContext !== undefined,
        })
    }, [
        client,
        clientStatus,
        isJoining,
        signerContext,
        space,
        spaceDataMap,
        spaceIdFromPathname,
        usernameConfirmed,
    ])

    if (!spaceIdFromPathname) {
        return <Outlet />
    }

    // if a user has hit the join/login button from the non-authenticated public town page
    // continue to show the public town page and let the page complete the join/login flow
    if (isJoining) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
        return _PublicTownPage
    }

    // A user that has never joined a space will not have a client
    if (signerContext && !client) {
        // if we're "authenticated" but we don't have a client we need to show the public town page
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
        return _PublicTownPage
    }

    // space can take some time to sync on load
    // we need to wait for the space to be ready
    if (!client || space === undefined) {
        // if user has loaded other spaces, but not this space, it indicates they've not joined this space
        if (
            spaceDataMap &&
            Object.keys(spaceDataMap).length &&
            spaceDataMap[spaceIdFromPathname] === undefined
        ) {
            AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
            return _PublicTownPage
        }

        return <AppSkeletonView />
    }

    if (!space.hasLoadedMemberships) {
        return <AppSkeletonView />
    }

    const isMember = space.membership === Membership.Join

    if (!isMember) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
        return _PublicTownPage
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
