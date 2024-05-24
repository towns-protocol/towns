import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { WEB_PUSH_NAVIGATION_CHANNEL } from 'workers/types.d'
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
            const path = event.data.path
            log('[useAppNotifications][route] received navigation event on broadcast channel', {
                deviceType,
                url: path,
            })
            navigate(path)
        }

        return () => {
            broadcastChannel.close()
        }
    }, [navigate, isTouch])
}
