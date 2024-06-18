import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { WEB_PUSH_NAVIGATION_CHANNEL } from 'workers/types.d'

import { useNotificationRoute } from './useNotificationRoute'
import { useDevice } from './useDevice'

const TAG = '[useAppNotifications][route]'
const log = console.log

export function useAppNotifications() {
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const isTouchRef = useRef<boolean>(isTouch)
    const { urlPathnameSafeToNavigate } = useNotificationRoute()

    const navigateTo = useEvent((path: string) => {
        navigate(path, {
            state: { fromNotification: true },
        })
    })

    useEffect(() => {
        log(TAG, 'mounted: open broadcast channel')
        const broadcastChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)
        broadcastChannel.onmessage = (event) => {
            const path = urlPathnameSafeToNavigate(event.data.path, event.data.channelId)
            log(TAG, 'received navigation event on broadcast channel', {
                deviceType: isTouchRef.current ? 'mobile' : 'desktop',
                eventDataPath: event.data.path,
                eventDataChannelId: event.data.channelId,
                eventDataThreadId: event.data.threadId,
                url: path,
            })
            navigateTo(path)
        }

        return () => {
            log(TAG, 'unmounted: close broadcast channel')
            broadcastChannel.close()
        }
    }, [navigateTo, urlPathnameSafeToNavigate])
}
