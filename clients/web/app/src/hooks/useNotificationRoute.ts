import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { useCallback, useRef } from 'react'

import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useDevice } from './useDevice'

export function useNotificationRoute() {
    const { isTouch } = useDevice()
    const isTouchRef = useRef<boolean>(isTouch)
    const defaultSpaceIdRef = useRef<string>()

    const spaceIdBookmark = useStore((s) => {
        return s.spaceIdBookmark ?? ''
    })

    defaultSpaceIdRef.current = spaceIdBookmark

    const urlPathnameSafeToNavigate = useCallback(
        (pathnameWithSearch: string, channelId: string) => {
            const isDmOrGdmChannelId =
                isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)
            if (isTouchRef.current && defaultSpaceIdRef.current && isDmOrGdmChannelId) {
                // special case for DMs on touch
                const url = new URL(pathnameWithSearch, window.location.origin)
                url.pathname = `/${PATHS.SPACES}/${defaultSpaceIdRef.current}/${PATHS.MESSAGES}/${channelId}`
                return url.pathname + url.search
            } else {
                return pathnameWithSearch
            }
        },
        [],
    )

    return {
        urlPathnameSafeToNavigate,
    }
}
