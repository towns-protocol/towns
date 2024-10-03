import { makeSpaceStreamId } from '@river-build/sdk'
import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router'
import { PATHS } from 'routes'

export const useSpaceIdFromPathname = () => {
    const { pathname } = useLocation()

    return useMemo(() => {
        const match = matchPath(`${PATHS.SPACES}/:spaceId/*`, pathname)
        const spaceId = match?.params.spaceId
        if (!match || !spaceId || spaceId === 'new') {
            return
        }

        if (spaceId.startsWith('0x')) {
            return makeSpaceStreamId(spaceId)
        }
        return spaceId
    }, [pathname])
}
