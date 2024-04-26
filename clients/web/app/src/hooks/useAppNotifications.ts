import { useEffect } from 'react'
import { matchPath, useNavigate } from 'react-router'
import { WEB_PUSH_NAVIGATION_CHANNEL } from 'workers/types.d'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useDevice } from './useDevice'

// print as warn to debug hnt-5685
const log = console.warn

export const useAppNotifications = () => {
    const navigate = useNavigate()
    const { isTouch } = useDevice()

    useEffect(() => {
        const broadcastChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)
        broadcastChannel.onmessage = (event) => {
            const deviceType = isTouch ? 'mobile' : 'desktop'
            log('[useAppNotifications] received navigation event on broadcast channel', {
                deviceType,
                url: event.data.path,
                refEventId: event.data.refEventId ? event.data.refEventId : 'undefined',
            })
            if (isTouch) {
                // matchPath requires the string to start with a '/'
                const prefix = event.data.path.startsWith('/') ? '' : '/'
                const match = matchPath(`${PATHS.MESSAGES}/:channelId`, prefix + event.data.path)
                const spaceId = useStore.getState().spaceIdBookmark
                if (match && match.params.channelId && spaceId) {
                    const path = `/${PATHS.SPACES}/${spaceId}/${PATHS.MESSAGES}/${match.params.channelId}`
                    const urlWithParams = getPathWithParams(path)
                    log(
                        '[useAppNotifications][push_hnt-5685] on mobile - patch the path',
                        'route',
                        {
                            deviceType,
                            pathname: urlWithParams,
                            refEventId: event.data.refEventId ? event.data.refEventId : 'undefined',
                        },
                    )
                    navigate(urlWithParams)
                    return
                }
            }

            const path = event.data.path
            const urlWithParams = getPathWithParams(path)
            log('[useAppNotifications][push_hnt-5685] navigating to', 'route', {
                deviceType,
                pathname: urlWithParams,
                refEventId: event.data.refEventId ? event.data.refEventId : 'undefined',
            })
            navigate(urlWithParams)
        }

        return () => {
            broadcastChannel.close()
        }
    }, [navigate, isTouch])
}

function getPathWithParams(path: string): string {
    const url = new URL(window.location.origin)
    url.pathname = path
    url.searchParams.set('track_source', 'broadcast_channel')
    return url.pathname + url.search
}
