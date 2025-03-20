import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { AuthStatus, useConnectivity, useTownsClient, useTownsContext } from 'use-towns-client'
import { Membership } from '@towns-protocol/sdk'
import { PATHS } from 'routes'
import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { useDebounce } from 'hooks/useDebounce'
import { SECOND_MS } from 'data/constants'
import { ExploreMobile, ExplorePage } from './ExplorePage/ExplorePage'

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
        return isTouch ? <ExploreMobile /> : <ExplorePage />
    }
}
