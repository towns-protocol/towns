import React, { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
    AuthStatus,
    Membership,
    useConnectivity,
    useTownsClient,
    useTownsContext,
} from 'use-towns-client'
import { PATHS } from 'routes'
import { Button, Heading, Icon, Stack, Text } from '@ui'

import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { Analytics } from 'hooks/useAnalytics'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { useDebounce } from 'hooks/useDebounce'
import { SECOND_MS } from 'data/constants'

export const NoJoinedSpacesFallback = () => {
    const navigate = useNavigate()
    const { spaces } = useTownsContext()
    const { client } = useTownsClient()
    const { authStatus } = useConnectivity()
    const { clientStatus } = useTownsContext()

    const spaceIdBookmark = useStore((s) => {
        return s.spaceIdBookmark
    })

    const { isTouch } = useDevice()
    const location = useLocation()

    useEffect(() => {
        console.log('[NoJoinedSpacesFallback][route]', 'route', {
            deviceType: isTouch ? 'mobile' : 'desktop',
            locationPathname: location.pathname,
            locationSearch: location.search,
            spaceIdBookmark,
        })
    }, [isTouch, location.pathname, location.search, spaceIdBookmark])

    useEffect(() => {
        Analytics.getInstance().page('home-page', 'no joined towns page', {}, () => {
            console.log('[analytics] no joined towns page')
        })
    }, [location.pathname, location.search])

    // attempting a tiny debounce in case the spaces are still loading
    // TODO: may want to remove this
    const numSpaces = useDebounce(spaces.length, SECOND_MS * 0.25)
    const hasSpaces = numSpaces > 0

    useEffect(() => {
        console.log('[NoJoinedSpacesFallback][route] spaces.length', spaces.length)
    }, [spaces.length])

    useEffect(() => {
        console.log('[NoJoinedSpacesFallback][route] numSpaces', numSpaces)
    }, [numSpaces])

    useEffect(() => {
        console.log('[NoJoinedSpacesFallback][route] clientStatus', clientStatus)
    }, [clientStatus])

    useEffect(() => {
        if (!client) {
            return
        }
        if (hasSpaces) {
            const firstSpaceId = spaces[0].id
            const bookmarkedSpaceId =
                spaces.find((space) => space.id === spaceIdBookmark)?.id ?? firstSpaceId

            const defaultSpaceId = bookmarkedSpaceId ?? firstSpaceId

            if (defaultSpaceId === firstSpaceId) {
                console.log(
                    `[NoJoinedSpacesFallback][route] warning first space selected out of ${spaces.length} spaces`,
                )
            }

            console.log('[NoJoinedSpacesFallback][route] Bookmark info', {
                bookmarkedSpaceId,
                firstSpaceId,
                defaultSpaceId,
                spaceIds: spaces.map((s) => s.id),
            })

            if (client.getMembership(defaultSpaceId) === Membership.Join) {
                console.log('[NoJoinedSpacesFallback][route] Navigating to first space', {
                    firstSpaceId: defaultSpaceId,
                    path: `/${PATHS.SPACES}/${defaultSpaceId}/`,
                    deviceType: isTouch ? 'mobile' : 'desktop',
                })
                navigate(`/${PATHS.SPACES}/${defaultSpaceId}/`)
            }
        }
    }, [client, hasSpaces, isTouch, navigate, spaceIdBookmark, spaces])

    const openTownPanel = useCallback(() => {
        Analytics.getInstance().track('clicked create a town', {}, () => {
            console.log('[analytics] clicked create a town')
        })
        navigate(`/${PATHS.SPACES}/new`)
    }, [navigate])

    const openLearnMore = useCallback(() => {
        Analytics.getInstance().track('clicked learn more', {}, () => {
            console.log('[analytics] clicked learn more')
        })
        window.open(
            'https://www.notion.so/herenottherelabs/Town-Hall-9e5c8120218d489392e8a72aef8c0326?pvs=4',
            '_blank',
            'noopener,noreferrer',
        )
    }, [])

    // need to default spaceHierarchies to undefined and check for it here
    // to prevent flash on load
    // if (!spaceDataMap) {
    //     return <AppSkeletonView />
    // }

    if (hasSpaces) {
        console.log('[app progress] no joined spaces fallback: no spaces')
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.LoggingIn}
                debugSource={`no-joined-spaces spaces:${spaces.length}`}
            />
        )
    } else if (authStatus === AuthStatus.EvaluatingCredentials) {
        console.log('[app progress] no joined spaces fallback: logging in')
        return (
            <AppProgressOverlayTrigger
                progressState={AppProgressState.LoggingIn}
                debugSource="no-joined-spaces login"
            />
        )
    } else if (authStatus === AuthStatus.ConnectedToRiver && !clientStatus.isLocalDataLoaded) {
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
                            Start Your First Town
                        </Heading>
                        <Text textAlign="center" color="gray2">
                            Build a town and invite your friends or community.
                        </Text>
                    </Stack>
                    <Stack horizontal gap>
                        <Button tone="cta1" width="auto" grow={false} onClick={openTownPanel}>
                            Create a Town
                        </Button>
                        <Button tone="level2" width="auto" grow={false} onClick={openLearnMore}>
                            Learn More
                        </Button>
                    </Stack>
                </Stack>
            </Stack>
        )
    }
}
