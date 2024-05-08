import capitalize from 'lodash/capitalize'
import React, { useEffect, useMemo } from 'react'
import { Outlet, useMatch } from 'react-router'
import { matchPath, useLocation } from 'react-router-dom'
import { Channel, SpaceContextProvider, SpaceData, useTownsContext } from 'use-towns-client'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useSetDocTitle } from 'hooks/useDocTitle'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { APP_NAME } from 'data/constants'
import { useDevice } from 'hooks/useDevice'

export interface RouteParams {
    spaceId?: string
    channelId?: string
}

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
    const { casablancaClient } = useTownsContext()
    const { serverSpace: space, chainSpace } = useContractAndServerSpaceData()
    const { isTouch } = useDevice()

    const spaceSlug = space?.id ?? ''
    const setTownRouteBookmark = useStore((s) => s.setTownRouteBookmark)

    const setTitle = useSetDocTitle()

    const path = useSpaceRouteMatcher(space)
    const spaceName = space?.name || chainSpace?.name

    useEffect(() => {
        const locationPathname = path?.pathname ?? ''
        const locationSearch = path?.search ?? ''
        console.warn('[SpaceContextRoute][hnt-5685]', 'route', {
            rpcClient: casablancaClient?.rpcClient.url ?? '',
            locationPathname,
            locationSearch,
            path: path ?? '',
            spaceSlug,
            deviceType: isTouch ? 'mobile' : 'desktop',
        })
        if (
            !path ||
            (path.type !== 'messages' && !spaceSlug) ||
            path.type === 'home' ||
            path.type === 'settings'
        ) {
            return
        }
        if (path.type === 'messages') {
            setTownRouteBookmark(spaceSlug, locationPathname)
        } else if (spaceSlug && path.type === 'channel') {
            // bookmark channel and known routes
            setTownRouteBookmark(spaceSlug, locationPathname)
        } else if (spaceSlug && path.type === 'generic') {
            // bookmark known routes (threads,mentions,etc)
            setTownRouteBookmark(spaceSlug, locationPathname)
        } else if (spaceSlug) {
            // reset bookmark in case the route isn't referenced above
            setTownRouteBookmark(spaceSlug, '')
        }
    }, [casablancaClient?.rpcClient.url, isTouch, path, setTownRouteBookmark, spaceSlug])

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

export interface RouteInfo {
    type: 'channel' | 'invite' | 'messages' | 'settings' | 'generic' | 'home' | 'notfound'
    pathname: string
    search: string
    name?: string
    channel?: Channel
}

const useSpaceRouteMatcher = (space: SpaceData | undefined): RouteInfo | undefined => {
    const location = useLocation()
    const { isTouch } = useDevice()

    return useMemo(() => {
        const pathInfo = {
            pathname: location.pathname,
            search: location.search,
        }
        const channelPath = matchPath(
            `${SPACES}/:spaceSlug/${CHANNELS}/:channelId`,
            pathInfo.pathname,
        )
        const childSpacePath = matchPath(`${SPACES}/:spaceSlug/:child/*`, pathInfo.pathname)
        const homeSpacePath = matchPath(`${SPACES}/:spaceSlug/`, pathInfo.pathname)

        const paramsChannelId = channelPath?.params.channelId
        const paramsChild = childSpacePath?.params.child

        if (paramsChannelId) {
            if (space) {
                const channels = space.channelGroups.flatMap((g) => g.channels)
                const channel = channels.find((c) => c.id === paramsChannelId)
                return {
                    type: 'channel',
                    channel,
                    ...pathInfo,
                } as const
            }
        } else {
            if (pathInfo.search.includes('invite')) {
                return {
                    type: 'invite',
                    ...pathInfo,
                } as const
            } else if (pathInfo.pathname.includes(MESSAGES)) {
                if (isTouch) {
                    // handle the special case for Touch devices where the spaceId is inserted into the path
                    const { spaceId, channelId } = getRouteParams(pathInfo.pathname)
                    let spaceIdBookmark = spaceId
                    // if the pathname does not have a spaceId, get it from the current space
                    // if that is also unavailable, get it from the bookmark store
                    if (!spaceIdBookmark) {
                        const spaceIdFromStore = useStore.getState().spaceIdBookmark
                        spaceIdBookmark = space ? space.id : spaceIdFromStore
                    }
                    if (spaceIdBookmark && channelId) {
                        pathInfo.pathname = `/${SPACES}/${spaceIdBookmark}/${MESSAGES}/${channelId}`
                    }
                }
                return {
                    type: 'messages',
                    ...pathInfo,
                } as const
            } else if (pathInfo.pathname.includes(SETTINGS)) {
                return {
                    type: 'settings',
                    ...pathInfo,
                } as const
            } else {
                return paramsChild
                    ? ({
                          type: 'generic',
                          name: paramsChild,
                          ...pathInfo,
                      } as const)
                    : homeSpacePath
                    ? ({ type: 'home', ...pathInfo } as const)
                    : ({ type: 'notfound', ...pathInfo } as const)
            }
        }
    }, [isTouch, location.pathname, location.search, space])
}

export function getRouteParams(path?: string): RouteParams {
    if (!path) {
        return {}
    }
    // matchPath requires the string to start with a '/'
    const prefix = path.startsWith('/') ? '' : '/'
    path = prefix + path
    // match for full spaceId and channelId in the path
    const matchWithSpace = matchPath(
        {
            path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/`,
        },
        path,
    )
    // match for desktop devices where the channelId is in the path, but no spaceId
    const matchWithMessages = matchPath(
        {
            path: `${PATHS.MESSAGES}/:channelId`,
        },
        path,
    )
    // match for Touch devices where the spaceId is inserted into the path
    const matchWithSpaceMessages = matchPath(
        {
            path: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/:channelId/`,
        },
        path,
    )
    let spaceId: string | undefined
    let channelId: string | undefined
    if (matchWithSpace?.params.spaceId) {
        spaceId = matchWithSpace.params.spaceId
    }
    if (matchWithSpace?.params.channelId) {
        channelId = matchWithSpace.params.channelId
        console.warn('[SpaeContextRoute][hnt-5685]', 'route', {
            spaceId: spaceId ?? '',
            channelId,
            matchPath: 'matchWithSpace',
        })
    } else if (matchWithMessages?.params.channelId) {
        channelId = matchWithMessages.params.channelId
        console.log('[SpaeContextRoute][hnt-5685]', 'route', {
            spaceId: spaceId ?? '',
            channelId,
            matchPath: 'matchWithMessages',
        })
    } else if (matchWithSpaceMessages?.params.channelId) {
        channelId = matchWithSpaceMessages.params.channelId
        console.log('[SpaeContextRoute][hnt-5685]', 'route', {
            spaceId: spaceId ?? '',
            channelId,
            matchPath: 'matchWithSpaceMessages',
        })
    }
    return { spaceId, channelId }
}
