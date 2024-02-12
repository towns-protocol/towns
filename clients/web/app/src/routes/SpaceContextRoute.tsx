import capitalize from 'lodash/capitalize'
import React, { useEffect, useMemo } from 'react'
import { Outlet, useMatch } from 'react-router'
import { matchPath, useLocation } from 'react-router-dom'
import { SpaceContextProvider, SpaceData } from 'use-zion-client'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useSetDocTitle } from 'hooks/useDocTitle'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { APP_NAME } from 'data/constants'

const createSpaceTitle = (spaceName?: string, childLabel?: string) => {
    return [childLabel, spaceName].filter(Boolean).concat(APP_NAME).join(' - ')
}

export const SpaceContextRoute = () => {
    const spaceRoute = useMatch({ path: `/${PATHS.SPACES}/:spaceSlug`, end: false })
    const spaceId = spaceRoute?.params.spaceSlug ?? ''

    return (
        <SpaceContextProvider spaceId={spaceId}>
            <SpaceContext />
        </SpaceContextProvider>
    )
}

const SpaceContext = () => {
    const { serverSpace: space, chainSpace } = useContractAndServerSpaceData()

    const spaceSlug = space?.id
    const setTownRouteBookmark = useStore((s) => s.setTownRouteBookmark)

    const setTitle = useSetDocTitle()

    const path = useSpaceRouteMatcher(space)
    const spaceName = space?.name || chainSpace?.name

    useEffect(() => {
        if (!path || !spaceSlug || path.type === 'home' || path.type === 'settings') {
            return
        }
        if (path.type === 'channel') {
            // bookmark channel and known routes
            setTownRouteBookmark(spaceSlug, location.pathname)
        } else if (path.type === 'messages') {
            // skip bookmarking outside of town
        } else if (path.type === 'generic') {
            // bookmark known routes (threads,mentions,etc)
            setTownRouteBookmark(spaceSlug, location.pathname)
        } else {
            // reset bookmark in case the route isn't referenced above
            setTownRouteBookmark(spaceSlug, '')
        }
    }, [path, setTownRouteBookmark, spaceSlug])

    const title = useMemo(() => {
        if (!path) {
            return createSpaceTitle()
        } else if (path.type === 'channel') {
            return createSpaceTitle(spaceName, path.channel?.label)
        } else if (path.type === 'generic') {
            return createSpaceTitle(spaceName, path.name ? capitalize(path.name) : undefined)
        } else if (path.type === 'invite') {
            return createSpaceTitle(`Join ${spaceName}`)
        } else if (path.type === 'home') {
            return createSpaceTitle(spaceName, 'home')
        } else {
            return createSpaceTitle(spaceName)
        }
    }, [path, spaceName])

    useEffect(() => {
        setTitle(title)
    }, [setTitle, title])

    return (
        <>
            <Outlet />
        </>
    )
}

const { CHANNELS, MESSAGES, SPACES, SETTINGS } = PATHS

const useSpaceRouteMatcher = (space: SpaceData | undefined) => {
    const location = useLocation()
    const pathname = location.pathname
    const locationSearch = location.search

    return useMemo(() => {
        const channelPath = matchPath(`${SPACES}/:spaceSlug/${CHANNELS}/:channelId`, pathname)
        const childSpacePath = matchPath(`${SPACES}/:spaceSlug/:child/*`, pathname)
        const homeSpacePath = matchPath(`${SPACES}/:spaceSlug/`, pathname)

        const paramsChannelId = channelPath?.params.channelId
        const paramsChild = childSpacePath?.params.child

        if (paramsChannelId) {
            if (space) {
                const channels = space.channelGroups.flatMap((g) => g.channels)
                const channel = channels.find((c) => c.id === paramsChannelId)
                return {
                    type: 'channel',
                    channel,
                } as const
            }
        } else {
            if (locationSearch.includes('invite')) {
                return {
                    type: 'invite',
                } as const
            } else if (pathname.includes(MESSAGES)) {
                return {
                    type: 'messages',
                } as const
            } else if (pathname.includes(SETTINGS)) {
                return {
                    type: 'settings',
                } as const
            } else {
                return paramsChild
                    ? ({
                          type: 'generic',
                          name: paramsChild,
                      } as const)
                    : homeSpacePath
                    ? ({ type: 'home' } as const)
                    : ({ type: 'notfound' } as const)
            }
        }
    }, [locationSearch, pathname, space])
}
