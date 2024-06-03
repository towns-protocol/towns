import capitalize from 'lodash/capitalize'
import React, { useEffect, useMemo } from 'react'
import { Outlet, useMatch } from 'react-router'
import { matchPath, useLocation, useSearchParams } from 'react-router-dom'
import { Channel, SpaceContextProvider, SpaceData, useTownsContext } from 'use-towns-client'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useSetDocTitle } from 'hooks/useDocTitle'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { APP_NAME } from 'data/constants'
import { useDevice } from 'hooks/useDevice'
import { useHnt5685 } from 'hooks/useHnt5685'

export interface RouteParams {
    spaceId?: string
    channelId?: string
    threadId?: string
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
    const location = useLocation()

    const spaceSlug = space?.id ?? ''
    const { setTownRouteBookmark, setNotificationRoute } = useStore((s) => {
        return {
            setTownRouteBookmark: s.setTownRouteBookmark,
            setNotificationRoute: s.setNotificationRoute,
        }
    })

    const setTitle = useSetDocTitle()
    const path = useSpaceRouteMatcher(space)
    const spaceName = space?.name || chainSpace?.name

    useEffect(() => {
        console.log('[SpaceContextRoute][route]', 'route', {
            spaceSlug,
            routeMatcherPathname: path?.pathname ?? '',
            routeMatcherNotificationDeepLink: path?.notificationDeepLink ?? '',
            locationPathname: location.pathname,
            routeMatcherSearch: path?.search ?? '',
            locationSearch: location.search,
            pathType: path?.type ?? '',
            rpcClient: casablancaClient?.rpcClient.url ?? '',
            deviceType: isTouch ? 'mobile' : 'desktop',
        })
    }, [
        casablancaClient?.rpcClient.url,
        isTouch,
        location.pathname,
        location.search,
        path?.type,
        path?.notificationDeepLink,
        path?.pathname,
        path?.search,
        spaceSlug,
    ])

    useEffect(() => {
        if (!path || !spaceSlug || path.type === 'home' || path.type === 'settings') {
            return
        }
        if (spaceSlug && path.type === 'channel') {
            // bookmark root / for mobile
            // bookmark channel path for desktop
            const route = isTouch ? '/' : path.pathname
            console.log('[SpaceContextRoute][route] setTownRouteBookmark', route)
            setTownRouteBookmark(spaceSlug, route)
        } else if (spaceSlug) {
            // reset bookmark in case the route isn't referenced above
            console.log('[SpaceContextRoute][route] setTownRouteBookmark', 'reset')
            setTownRouteBookmark(spaceSlug, '')
        }
    }, [isTouch, location.pathname, path, setTownRouteBookmark, spaceSlug])

    useEffect(() => {
        if (path?.notificationDeepLink) {
            setNotificationRoute(path.notificationDeepLink)
        }
    }, [path?.notificationDeepLink, setNotificationRoute])

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
    notificationDeepLink?: string
    notificationTimestamp?: number
}

const useSpaceRouteMatcher = (space: SpaceData | undefined): RouteInfo | undefined => {
    const location = useLocation()
    const { isTouch } = useDevice()
    const notificationRouteInfo = useHnt5685()
    const [search] = useSearchParams()

    const routeInfo = useMemo(() => {
        const scrubbedPathname = location.pathname.replace(/^\/\//, '/') // this can cause bug hnt-5685
        return {
            pathname: scrubbedPathname,
            search: location.search,
            notificationDeepLink: notificationRouteInfo?.notificationDeepLink,
        }
    }, [location.pathname, location.search, notificationRouteInfo])

    return useMemo(() => {
        const channelPath = matchPath(
            `${SPACES}/:spaceSlug/${CHANNELS}/:channelId`,
            routeInfo.pathname,
        )
        const childSpacePath = matchPath(`${SPACES}/:spaceSlug/:child/*`, routeInfo.pathname)
        const homeSpacePath = matchPath(`${SPACES}/:spaceSlug/`, routeInfo.pathname)

        const paramsChannelId = channelPath?.params.channelId
        const paramsChild = childSpacePath?.params.child

        if (paramsChannelId) {
            if (space) {
                const channels = space.channelGroups.flatMap((g) => g.channels)
                const channel = channels.find((c) => c.id === paramsChannelId)
                return {
                    type: 'channel',
                    channel,
                    ...routeInfo,
                } as const
            }
        } else {
            if (routeInfo.search.includes('invite')) {
                return {
                    type: 'invite',
                    ...routeInfo,
                } as const
            } else if (routeInfo.pathname.includes(MESSAGES)) {
                if (isTouch) {
                    // handle the special case for Touch devices where the spaceId is inserted into the path
                    const { spaceId, channelId } = getRouteParams(routeInfo.pathname)
                    let spaceIdBookmark = spaceId
                    // handle the special case for Touch devices where
                    // the navigation stack is different between HOME and MESSAGES
                    const params = new URLSearchParams(search)
                    params.set('stackId', 'direct-messages')
                    const searchWithDmStackId = `?${params.toString()}`
                    // if the pathname does not have a spaceId, get it from the current space
                    // if that is also unavailable, get it from the bookmark store
                    if (!spaceIdBookmark) {
                        const spaceIdFromStore = useStore.getState().spaceIdBookmark
                        spaceIdBookmark = space ? space.id : spaceIdFromStore
                    }
                    if (spaceIdBookmark) {
                        routeInfo.pathname = `/${SPACES}/${spaceIdBookmark}`
                        routeInfo.search = searchWithDmStackId
                        if (channelId) {
                            routeInfo.notificationDeepLink = `/${SPACES}/${spaceIdBookmark}/${MESSAGES}/${channelId}`
                        } else {
                            routeInfo.notificationDeepLink = `/${SPACES}/${spaceIdBookmark}/${MESSAGES}`
                        }
                    }
                }
                return {
                    type: 'messages',
                    ...routeInfo,
                } as const
            } else if (routeInfo.pathname.includes(SETTINGS)) {
                return {
                    type: 'settings',
                    ...routeInfo,
                } as const
            } else {
                return paramsChild
                    ? ({
                          type: 'generic',
                          name: paramsChild,
                          ...routeInfo,
                      } as const)
                    : homeSpacePath
                    ? ({ type: 'home', ...routeInfo } as const)
                    : ({ type: 'notfound', ...routeInfo } as const)
            }
        }
    }, [isTouch, routeInfo, search, space])
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
    // match for full spaceId, channelId, threadId in the path
    const matchWithSpaceChannelThread = matchPath(
        {
            path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/${PATHS.REPLIES}/:threadId/`,
        },
        path,
    )
    // match for desktop devices where the channelId is in the path, but no spaceId
    const matchWithMessages = matchPath(
        {
            path: `/${PATHS.MESSAGES}/:channelId/`,
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
    let threadId: string | undefined
    if (matchWithSpace?.params.spaceId) {
        spaceId = matchWithSpace.params.spaceId
    }
    if (matchWithSpace?.params.channelId) {
        spaceId = matchWithSpace.params.spaceId
        channelId = matchWithSpace.params.channelId
    } else if (matchWithMessages?.params.channelId) {
        channelId = matchWithMessages.params.channelId
    } else if (matchWithSpaceMessages?.params.channelId) {
        channelId = matchWithSpaceMessages.params.channelId
    } else if (matchWithSpaceChannelThread?.params.threadId) {
        spaceId = matchWithSpaceChannelThread.params.spaceId
        channelId = matchWithSpaceChannelThread.params.channelId
        threadId = matchWithSpaceChannelThread.params.threadId
    }
    return { spaceId, channelId, threadId }
}
