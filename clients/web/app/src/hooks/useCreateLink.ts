import { useMemo } from 'react'
import { generatePath, matchRoutes, useLocation } from 'react-router'
import { PATHS } from 'routes'

type Path = {
    path: string
    replace?: string
}

const profilePaths = [
    {
        path: `/profile?/:profileId?`,
        replace: `/me`,
    },
    // matches channel, profile
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel?/:channelPanelParam?`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/profile/:profileId`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/:channelId/:channelPanel?/:channelPanelParam?`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/:channelId/profile/:profileId`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/home/profile?/:profileId?`,
        replace: `/${PATHS.SPACES}/:spaceId/profile/:profileId`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/search/profile?/:profileId?`,
        replace: `/${PATHS.SPACES}/:spaceId/profile/:profileId`,
    },
    {
        path: `/${PATHS.MESSAGES}/:channelId/*`,
        replace: `/${PATHS.MESSAGES}/:channelId/profile/:profileId`,
    },
    // wildcard matching for one level deep profiles such as threads/mentions
    { path: `/${PATHS.SPACES}/:spaceId/:customPath/profile?/:profileId?` },

    // TODO: may not need this
    { path: `/${PATHS.SPACES}/:spaceId/profile?/:profileId?` },
] satisfies Path[]

const browseChannelsPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?browse-channels`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path/info`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/info?browse-channels`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path/:panelPath/:panelPathId`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/info?browse-channels`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/info?browse-channels`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path/:channelId`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/:channelId/info?browse-channels`,
    },

    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel/:channelPanelParam`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?browse-channels`,
    },
]

const townInfoPaths: Path[] = [
    { path: `/${PATHS.SPACES}/:spaceId/:path/info?` },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path/:panelPath/:panelPathId`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/info`,
    },
    { path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?` },
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel/:channelPanelParam`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info`,
    },
]

const channelInfoPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?channel`,
    },
]

const channelPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/`,
    },
]

const createChannelPaths: Path[] = [
    { path: `/${PATHS.SPACES}/:spaceId/:path/info?create-channel` },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path/info`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/info?create-channel`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?create-channel`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path/:panelPath/:panelPathId`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/info?create-channel`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/info?create-channel`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/:path/:channelId`,
        replace: `/${PATHS.SPACES}/:spaceId/:path/:channelId/info?create-channel`,
    },
    { path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?create-channel` },
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel/:channelPanelParam`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?create-channel`,
    },
]

const channelDirectoryPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel?/:channelPanelParam?`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?directory`,
    },
]

const initialTouchChannelPaths: Path[] = [
    {
        path: '/',
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId`,
    },
    {
        path: '',
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId`,
    },
]

const searchPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/search`,
    },
]

const townHomePaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId`,
    },
]

const threadPaths: Path[] = [
    {
        path: `/${PATHS.MESSAGES}/:channelId/*`,
        replace: `/${PATHS.MESSAGES}/:channelId/replies/:threadId`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/:messageId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/:messageId/replies/:threadId`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/channels/:channelId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/channels/:channelId/replies/:threadId`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/channels/:channelId/replies/:threadId`,
    },
]

const messagesPaths: Path[] = [
    {
        path: `/${PATHS.MESSAGES}`,
        replace: `/${PATHS.MESSAGES}`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}`,
    },
]

const messagesThreadPaths: Path[] = [
    {
        path: `/${PATHS.MESSAGES}/*`,
        replace: `/${PATHS.MESSAGES}/:messageId`,
    },
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/:messageId`,
    },
]

const threadsRoutePaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.THREADS}`,
    },
]
const mentionsRoutePaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.MENTIONS}`,
    },
]

const linkParams = {
    messageThreads: {
        params: {
            messageId: 'messageId' as string | undefined,
        },
    },
    profile: {
        params: {
            profileId: 'profileId' as string | undefined,
        },
    },
    townInfo: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            panel: 'townInfo',
        },
    },
    browseChannels: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            panel: 'browse-channels',
        },
    },
    channel: {
        params: {
            channelId: 'spaceId' as string | undefined,
        },
    },
    createChannel: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            panel: 'create-channel',
        },
    },
    channelInfo: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            channelId: 'channelId' as string | undefined,
            panel: 'channelInfo',
        },
    },
    channelDirectory: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            channelId: 'channelId' as string | undefined,
            panel: 'channelDirectory',
        },
    },
    initialTouchChannelPaths: {
        params: {
            initial: 'initial' as string,
            spaceId: 'spaceId' as string | undefined,
            channelId: 'channelId' as string | undefined,
        },
    },
    thread: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            channelId: 'channelId' as string | undefined,
            messageId: 'messageId' as string | undefined,
            threadId: 'threadId' as string | undefined,
        },
    },
    search: {
        params: {
            route: 'search' as const,
        },
    },
    home: {
        params: {
            route: 'townHome' as const,
        },
    },
    messages: {
        params: {
            route: 'messages',
        },
    },
    threads: {
        params: {
            route: 'threads',
        },
    },
    mentions: {
        params: {
            route: 'mentions',
        },
    },
} as const

type LinkParams = (typeof linkParams)[keyof typeof linkParams]['params']

const getSearchPathsForParams = (linkParams: LinkParams) => {
    if ('route' in linkParams && linkParams.route === 'search') {
        return searchPaths
    }
    if ('route' in linkParams && linkParams.route === 'messages') {
        return messagesPaths
    }
    if ('route' in linkParams && linkParams.route === 'threads') {
        return threadsRoutePaths
    }
    if ('route' in linkParams && linkParams.route === 'mentions') {
        return mentionsRoutePaths
    }
    if ('route' in linkParams && linkParams.route === 'townHome') {
        return townHomePaths
    }
    if ('threadId' in linkParams) {
        return threadPaths
    }
    if ('messageId' in linkParams) {
        return messagesThreadPaths
    }
    if ('profileId' in linkParams) {
        return profilePaths
    }

    if (
        'spaceId' in linkParams &&
        'panel' in linkParams &&
        linkParams.panel === 'browse-channels'
    ) {
        return browseChannelsPaths
    }

    if ('spaceId' in linkParams && 'panel' in linkParams && linkParams.panel === 'townInfo') {
        return townInfoPaths
    }

    if ('spaceId' in linkParams && 'panel' in linkParams && linkParams.panel === 'create-channel') {
        return createChannelPaths
    }

    if ('initial' in linkParams) {
        return initialTouchChannelPaths
    }
    if ('channelId' in linkParams) {
        if ('panel' in linkParams && linkParams.panel === 'channelInfo') {
            return channelInfoPaths
        }
        if ('panel' in linkParams && linkParams.panel === 'channelDirectory') {
            return channelDirectoryPaths
        }
        return channelPaths
    }
}

export const useCreateLink = () => {
    const { pathname } = useLocation()

    return useMemo(
        () => ({
            createLink: (linkParams: LinkParams) => {
                const paths = getSearchPathsForParams(linkParams)

                if (!paths) {
                    return undefined
                }

                const matches = matchRoutes(paths, pathname)
                const match = matches?.[0]

                if (match) {
                    const path = match.route.replace ?? match.route.path

                    // remove undefined values so they don't override existing params
                    const filteredParams = Object.fromEntries(
                        Object.entries(linkParams).filter(
                            ([k, v]) => !match.params[k] || v !== undefined,
                        ),
                    )
                    const params = {
                        ...match.params,
                        ...filteredParams,
                    }

                    const someParamIsUndefined = Object.values(params).some((v) => v === undefined)
                    if (someParamIsUndefined) {
                        return undefined
                    }

                    const generated = generatePath(path, params)
                    return generated
                }

                return undefined
            },
        }),
        [pathname],
    )
}
