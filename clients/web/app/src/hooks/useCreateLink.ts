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
    // wildcard matching for one level deep profiles such as threads/mentions
    { path: `/${PATHS.SPACES}/:spaceId/:customPath/profile?/:profileId?` },
    {
        path: `/${PATHS.SPACES}/:spaceId/home/profile?/:profileId?`,
        replace: `/${PATHS.SPACES}/:spaceId/profile/:profileId`,
    },
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
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel?/:channelPanelParam?`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?channel`,
    },
]

const channelDirectoryPaths: Path[] = [
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/:channelPanel?/:channelPanelParam?`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/info?directory`,
    },
]

const linkParams = {
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
    channelInfo: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            channelId: 'spaceId' as string | undefined,
            panel: 'channelInfo',
        },
    },
    channelDirectory: {
        params: {
            spaceId: 'spaceId' as string | undefined,
            channelId: 'spaceId' as string | undefined,
            panel: 'channelDirectory',
        },
    },
} as const

type LinkParams = (typeof linkParams)[keyof typeof linkParams]['params']

const getSearchPathsForParams = (linkParams: LinkParams) => {
    if ('profileId' in linkParams) {
        return profilePaths
    }
    if ('spaceId' in linkParams && linkParams.panel === 'townInfo') {
        return townInfoPaths
    }
    if ('channelId' in linkParams) {
        if (linkParams.panel === 'channelInfo') {
            return channelInfoPaths
        }
        if (linkParams.panel === 'channelDirectory') {
            return channelDirectoryPaths
        }
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
                    const generated = generatePath(match.route.replace ?? match.route.path, {
                        ...match.params,
                        ...linkParams,
                    })
                    return generated
                }

                return undefined
            },
        }),
        [pathname],
    )
}
