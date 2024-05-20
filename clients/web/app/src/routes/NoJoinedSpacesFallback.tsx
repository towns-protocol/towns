import React, { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
    LoginStatus,
    Membership,
    useConnectivity,
    useTownsClient,
    useTownsContext,
} from 'use-towns-client'
import { PATHS } from 'routes'
import { Button, Heading, Icon, Stack, Text } from '@ui'

import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { replaceOAuthParameters, useAnalytics } from 'hooks/useAnalytics'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'

export const NoJoinedSpacesFallback = () => {
    const navigate = useNavigate()
    const { spaces } = useTownsContext()
    const { client } = useTownsClient()
    const { loginStatus } = useConnectivity()
    const { clientStatus } = useTownsContext()
    //const spaceDataMap = useSpaceDataStore((s) => s.spaceDataMap)

    const spaceIdBookmark = useStore((s) => {
        return s.spaceIdBookmark
    })

    const { isTouch } = useDevice()
    const location = useLocation()
    const { loggedInWalletAddress } = useConnectivity()
    const { analytics, anonymousId, pseudoId, setPseudoId } = useAnalytics()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    useEffect(() => {
        console.warn('[NoJoinedSpacesFallback][hnt-5685]', 'route', {
            deviceType: isTouch ? 'mobile' : 'desktop',
            locationPathname: location.pathname,
            locationSearch: location.search,
            spaceIdBookmark,
        })
    }, [isTouch, location.pathname, location.search, spaceIdBookmark])

    useEffect(() => {
        if (pseudoId === undefined && loggedInWalletAddress && abstractAccountAddress) {
            const pId = setPseudoId(loggedInWalletAddress)
            analytics?.identify(
                pId,
                {
                    abstractAccountAddress,
                    anonymousId,
                    loggedInWalletAddress,
                    pseudoId: pId,
                },
                () => {
                    console.log('[analytics][NoJoinedSpacesFallback] identify logged in user')
                },
            )
        }
    }, [
        abstractAccountAddress,
        analytics,
        anonymousId,
        loggedInWalletAddress,
        pseudoId,
        setPseudoId,
    ])

    useEffect(() => {
        analytics?.page(
            'home-page',
            'No Joined Spaces Fallback',
            {
                path: '*',
                locationPathname: location.pathname,
                locationSearch: replaceOAuthParameters(location.search),
                anonymousId,
            },
            () => {
                console.log('[analytics] No Joined Spaces Fallback')
            },
        )
    }, [analytics, anonymousId, location.pathname, location.search])

    useEffect(() => {
        if (!client) {
            return
        }
        if (spaces.length) {
            const firstSpaceId =
                spaces.find((space) => space.id === spaceIdBookmark)?.id ?? spaces[0].id

            if (client.getMembership(firstSpaceId) === Membership.Join) {
                console.warn('[NoJoinedSpacesFallback][hnt-5685] Navigating to first space', {
                    firstSpaceId,
                    path: `/${PATHS.SPACES}/${firstSpaceId}/`,
                    deviceType: isTouch ? 'mobile' : 'desktop',
                })
                navigate(`/${PATHS.SPACES}/${firstSpaceId}/`)
            }
        }
    }, [spaces, navigate, client, spaceIdBookmark, isTouch])

    const openTownPanel = useCallback(() => {
        navigate(`/${PATHS.SPACES}/new`)
    }, [navigate])

    // need to default spaceHierarchies to undefined and check for it here
    // to prevent flash on load
    // if (!spaceDataMap) {
    //     return <AppSkeletonView />
    // }

    if (spaces.length) {
        console.log('[app progress] no joined spaces fallback: no spaces')
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.LoggingIn}
                debugSource="no-joined-spaces spaces.length"
            />
        )
    } else if (loginStatus === LoginStatus.LoggingIn) {
        console.log('[app progress] no joined spaces fallback: logging in')
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.LoggingIn}
                debugSource="no-joined-spaces login"
            />
        )
    } else if (loginStatus === LoginStatus.LoggedIn && !clientStatus.isLocalDataLoaded) {
        console.log('[app progress] no joined spaces fallback: InitializingWorkspace')
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.InitializingWorkspace}
                debugSource="no-joined-spaces data not loaded"
            />
        )
    } else {
        return (
            <Stack
                centerContent
                data-testid="space-home-fallback-content"
                paddingX="lg"
                height="100%"
            >
                <Stack centerContent gap="x4">
                    <Icon padding="md" size="square_xl" type="home" background="level2" />
                    <Stack centerContent gap>
                        <Heading level={3} textAlign="center">
                            You don&apos;t have invitations to any town
                        </Heading>
                        <Text textAlign="center" color="gray2">
                            Quit waiting around and start a town now:
                        </Text>
                    </Stack>
                    <Button tone="cta1" width="auto" grow={false} onClick={openTownPanel}>
                        Create a Town
                    </Button>
                </Stack>
            </Stack>
        )
    }
}
