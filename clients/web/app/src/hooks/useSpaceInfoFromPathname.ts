import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router'
import { PATHS } from 'routes'

export const useSpaceIdFromPathname = () => {
    const { pathname } = useLocation()

    return useMemo(() => {
        const match = matchPath(`${PATHS.SPACES}/:spaceSlug/*`, pathname)
        if (!match || !match.params.spaceSlug || match.params.spaceSlug === 'new') {
            return
        }
        return decodeURIComponent(match.params.spaceSlug)
    }, [pathname])
}
