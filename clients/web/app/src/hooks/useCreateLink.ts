import { useMemo } from 'react'
import { generatePath, matchRoutes, useLocation } from 'react-router'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'

type Path = {
    path: string
    replace?: string
}

const profilePaths = [
    {
        path: `/*`,
        replace: `?panel=profile&profileId=:profileId`,
    },
] satisfies Path[]

const browseChannelsPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/?panel=browse-channels`,
    },
]

const townInfoPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `?panel=town-info`,
    },
]

const channelInfoPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `?panel=${CHANNEL_INFO_PARAMS.CHANNEL_INFO}`,
    },
]

const channelPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/`,
    },
]

const createChannelPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `?panel=${CHANNEL_INFO_PARAMS.CREATE_CHANNEL}`,
    },
]

const channelDirectoryPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/*`,
        replace: `?panel=${CHANNEL_INFO_PARAMS.DIRECTORY}`,
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
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/new/draft/:draftMessageUserId`,
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
            channelId: 'channelId' as string | undefined,
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
    draftMessage: {
        params: {
            draftMessageUserId: 'draftMessageUserId' as string | undefined,
        },
    },
} as const

export type LinkParams = (typeof linkParams)[keyof typeof linkParams]['params']

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
    if ('draftMessageUserId' in linkParams) {
        return [messagesThreadPaths[2]]
    }
    if ('profileId' in linkParams) {
        return profilePaths.map((path) => ({
            ...path,
            // TODO: hack to to avoid updating all references to
            // useCreateLink({profileID:}) should be openPanel('profile', {profileId:})
            replace: path.replace?.replace(':profileId', linkParams.profileId ?? ''),
        }))
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
