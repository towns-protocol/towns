import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { APP_NOTIFICATIONS_BROADCAST_CHANNEL } from 'workers/types.d'
import { appNotificationFromPushEvent, pathFromAppNotification } from 'workers/notificationParsers'

export const useAppNotifications = () => {
    const navigate = useNavigate()

    useEffect(() => {
        const broadcastChannel = new BroadcastChannel(APP_NOTIFICATIONS_BROADCAST_CHANNEL)
        broadcastChannel.onmessage = (event) => {
            const notification = appNotificationFromPushEvent(event.data)
            if (!notification) {
                console.log("sw: couldn't parse notification")
                return
            }

            // todo: hook up the paths
            const path = pathFromAppNotification(notification)
            navigate(path)
        }

        return () => {
            broadcastChannel.close()
        }
    }, [navigate])
}
