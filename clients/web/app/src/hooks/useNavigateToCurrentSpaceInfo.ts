import { useCallback } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { useSpaceData } from 'use-zion-client'
import { PATHS } from 'routes'
import { useChannelIdFromPathname } from './useChannelIdFromPathname'
import { useDevice } from './useDevice'

export const useNavigateToCurrentSpaceInfo = () => {
    const space = useSpaceData()
    const { isTouch } = useDevice()
    const currentChannelId = useChannelIdFromPathname()
    const { pathname } = useLocation()
    const navigate = useNavigate()

    const navigateToCurrentSpace = useCallback(() => {
        if (!space?.id) {
            return
        }
        const currentSpacePathWithoutInfo = matchPath(
            `${PATHS.SPACES}/:spaceSlug/:current`,
            pathname,
        )

        let path

        if (isTouch) {
            path = `/${PATHS.SPACES}/${space.id}/info`
        } else if (currentChannelId) {
            path = `/${PATHS.SPACES}/${space.id}/channels/${currentChannelId}/info`
        } else if (currentSpacePathWithoutInfo) {
            path = `/${PATHS.SPACES}/${space.id}/${currentSpacePathWithoutInfo?.params.current}/info`
        }

        if (path) {
            navigate(path)
        }
    }, [currentChannelId, navigate, pathname, space?.id, isTouch])

    return { navigateToCurrentSpace }
}
