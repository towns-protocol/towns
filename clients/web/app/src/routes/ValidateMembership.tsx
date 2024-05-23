import React, { useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import {
    Membership,
    useMyUserId,
    useSpaceData,
    useSpaceDataStore,
    useTownsContext,
} from 'use-towns-client'
import AnalyticsService, { AnalyticsEvents } from 'use-towns-client/dist/utils/analyticsService'
import isEqual from 'lodash/isEqual'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { SetUsernameFormWithClose } from '@components/SetUsernameForm/SetUsernameForm'
import { useUsernameConfirmed } from 'hooks/useUsernameConfirmed'
import { useAnalytics } from 'hooks/useAnalytics'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { PublicTownPage } from './PublicTownPage/PublicTownPage'
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
    const { client, signerContext } = useTownsContext()
    const { isLocalDataLoaded, isRemoteDataLoaded } = useDataLoaded()
    const spaceIdFromPathname = useSpaceIdFromPathname()
    const { confirmed: usernameConfirmed } = useUsernameConfirmed()
    const { joiningSpace: isJoining } = usePublicPageLoginFlow()
    const [_PublicTownPage] = useState(<PublicTownPage />)
    const spaceDataIds = useSpaceDataIds()
    const { analytics, anonymousId, pseudoId, setPseudoId } = useAnalytics()
    const userId = useMyUserId()

    useEffect(() => {
        console.log('ValidateMembership', spaceIdFromPathname, {
            usernameConfirmed,
            isLocalDataLoaded,
            isRemoteDataLoaded,
            client: client !== undefined,
            isJoining,
            space: space !== undefined,
            spaceIdFromPathname,
            spaceDataIds,
            signerContext: signerContext !== undefined,
        })
    }, [
        client,
        isLocalDataLoaded,
        isRemoteDataLoaded,
        isJoining,
        signerContext,
        space,
        spaceDataIds,
        spaceIdFromPathname,
        usernameConfirmed,
    ])

    useEffect(() => {
        if (pseudoId === undefined && userId) {
            const pId = setPseudoId(userId)
            analytics?.identify(
                pId,
                {
                    anonymousId,
                    pseudoId: pId,
                },
                () => {
                    console.log('[analytics][ValidateMembership] identify logged in user')
                },
            )
        }
    }, [analytics, anonymousId, pseudoId, setPseudoId, userId])

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
        if (
            // user has no spaces, alternatively they aren't loaded yet
            typeof spaceDataIds === 'undefined' ||
            // if user has loaded other spaces, but not this space, it indicates they've not joined this space
            (spaceDataIds && !spaceDataIds.includes(spaceIdFromPathname))
        ) {
            AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
            return _PublicTownPage
        }
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.LoggingIn}
                debugSource="validateMembership space === undefined"
            />
        )
    }

    if (!space.hasLoadedMemberships) {
        // previously login state here but we might as well show loading
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.InitializingWorkspace}
                debugSource="validateMembership hasLoadedMemberships === false"
            />
        )
    }

    const isMember = space.membership === Membership.Join

    if (!isMember) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.PublicTownPage)
        return _PublicTownPage
    }

    AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.IsMember)

    if (!isRemoteDataLoaded || !isLocalDataLoaded) {
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.WelcomeLayoutLoadLocalData)
        return (
            <>
                {/* <Outlet /> <- we can add the app in the background underneath the progress */}
                <AppProgressOverlayTrigger
                    progressState={AppProgressState.InitializingWorkspace}
                    debugSource="!isRemoteDataLoaded || !isLocalDataLoaded"
                />
            </>
        )
    }

    return (
        <>
            <Outlet />
            {!usernameConfirmed && <SetUsernameFormWithClose spaceData={space} />}
        </>
    )
}

function useDataLoaded() {
    const { clientStatus } = useTownsContext()

    return useMemo(() => {
        return {
            isLocalDataLoaded: clientStatus.isLocalDataLoaded,
            isRemoteDataLoaded: clientStatus.isRemoteDataLoaded,
        }
    }, [clientStatus.isLocalDataLoaded, clientStatus.isRemoteDataLoaded])
}

function useSpaceDataIds() {
    const spaceDataMap = useSpaceDataStore((s) => s.spaceDataMap)
    const ids = spaceDataMap ? Object.keys(spaceDataMap) : undefined
    const [newIds, setNewIds] = useState<string[] | undefined>(ids)
    if (!isEqual(ids, newIds)) {
        setNewIds(ids)
    }

    return newIds
}
