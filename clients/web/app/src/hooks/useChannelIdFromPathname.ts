import { matchPath, useLocation } from 'react-router'
import { PATHS } from 'routes'

export const useChannelIdFromPathname = () => {
    const { pathname } = useLocation()
    const match = matchPath(`${PATHS.SPACES}/:spaceSlug/${PATHS.CHANNELS}/:channelSlug/*`, pathname)
    if (!match || !match.params.channelSlug) {
        return
    }
    return decodeURIComponent(match.params.channelSlug)
}
