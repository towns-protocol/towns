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

const channelDirectoryPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel?/:channelPanelParam?`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?directory`,
    },
]

const searchPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/*`,
        replace: `/${PATHS.SPACES}/:spaceId/search`,
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

const linkParams = {
    messsageIndex: {
        params: {
            index: 'messages' as const,
        },
    },
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
    channel: {
        params: {
            channelId: 'spaceId' as string | undefined,
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
    search: {
        params: {
            route: 'search',
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
} as const

type LinkParams = (typeof linkParams)[keyof typeof linkParams]['params']

const getSearchPathsForParams = (linkParams: LinkParams) => {
    if ('index' in linkParams && linkParams.index === 'messages') {
        return messagesPaths
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
    if ('spaceId' in linkParams && 'panel' in linkParams && linkParams.panel === 'townInfo') {
        return townInfoPaths
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
    if ('route' in linkParams && linkParams.route === 'search') {
        return searchPaths
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
                    const generated = generatePath(path, params)
                    return generated
                }

                return undefined
            },
        }),
        [pathname],
    )
}
