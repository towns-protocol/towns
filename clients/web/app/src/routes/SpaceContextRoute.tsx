import capitalize from 'lodash/capitalize'
import React, { useEffect, useMemo } from 'react'
import { Outlet, useMatch } from 'react-router'
import { matchPath, useLocation } from 'react-router-dom'
import { AutojoinChannels, SpaceContextProvider, SpaceData } from 'use-zion-client'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useSetDocTitle } from 'hooks/useDocTitle'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'

const createSpaceTitle = (spaceName?: string, childLabel?: string) => {
    return [childLabel, spaceName].filter(Boolean).concat('TOWNS').join(' - ')
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

    const spaceSlug = space?.id.slug
    const setTownRouteBookmark = useStore((s) => s.setTownRouteBookmark)

    const setTitle = useSetDocTitle()

    const path = useSpaceRouteMatcher(space)
    const spaceName = space?.name || chainSpace?.name

    useEffect(() => {
        if (!path || !spaceSlug || path.type === 'home') {
            return
        }
        if (path.type === 'channel') {
            // bookmark channel and known routes
            setTownRouteBookmark(spaceSlug, location.pathname)
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
            <AutojoinChannels />
            <Outlet />
        </>
    )
}

const { CHANNELS, SPACES } = PATHS

const useSpaceRouteMatcher = (space: SpaceData | undefined) => {
    const location = useLocation()
    const pathName = location.pathname
    const locationSearch = location.search

    return useMemo(() => {
        const channelPath = matchPath(`${SPACES}/:spaceSlug/${CHANNELS}/:channelId`, pathName)
        const childSpacePath = matchPath(`${SPACES}/:spaceSlug/:child/*`, pathName)
        const homeSpacePath = matchPath(`${SPACES}/:spaceSlug/`, pathName)

        const paramsChannelId = channelPath?.params.channelId
        const paramsChild = childSpacePath?.params.child

        if (paramsChannelId) {
            if (space) {
                const channels = space.channelGroups.flatMap((g) => g.channels)
                const channel = channels.find((c) => c.id.networkId === paramsChannelId)
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
    }, [locationSearch, pathName, space])
}
