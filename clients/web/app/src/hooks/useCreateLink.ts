import { generatePath, matchRoutes, useLocation } from 'react-router'
import { PATHS } from 'routes'

const paths = [
    {
        path: `/profile?/:profileId?`,
        replace: `/me`,
    },
    { path: `/${PATHS.SPACES}/:spaceId/${PATHS.THREADS}/profile?/:profileId?` },
    { path: `/${PATHS.SPACES}/:spaceId/${PATHS.MENTIONS}/profile?/:profileId?` },
    { path: `/${PATHS.SPACES}/:spaceId/${PATHS.MEMBERS}/profile?/:profileId?` },
    { path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/profile?/:profileId?` },
    {
        path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/replies/:replyId`,
        replace: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/profile/:profileId`,
    },
    { path: `/${PATHS.SPACES}/:spaceId/profile?/:profileId?` },
    {
        path: `/${PATHS.SPACES}/:spaceId/home/profile?/:profileId?`,
        replace: `/${PATHS.SPACES}/:spaceId/profile/:profileId`,
    },
]

const linkParams = {
    profile: {
        params: {
            profileId: 'profileId' as string | undefined,
        },
    },
}

type LinkParams = (typeof linkParams)[keyof typeof linkParams]['params']

export const useCreateLink = () => {
    const { pathname } = useLocation()
    return {
        createLink: (linkParams: LinkParams) => {
            const matches = matchRoutes(paths, pathname)
            const match = matches?.[0]

            if (match) {
                return generatePath(match.route.replace ?? match.route.path, {
                    ...match.params,
                    profileId: linkParams.profileId,
                })
            }

            return undefined
        },
    }
}
