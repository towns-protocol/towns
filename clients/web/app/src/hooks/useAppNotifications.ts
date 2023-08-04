import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { WEB_PUSH_NAVIGATION_CHANNEL } from 'workers/types.d'

export const useAppNotifications = () => {
    const navigate = useNavigate()

    useEffect(() => {
        const broadcastChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)
        broadcastChannel.onmessage = (event) => {
            navigate(event.data.path)
        }

        return () => {
            broadcastChannel.close()
        }
    }, [navigate])
}
