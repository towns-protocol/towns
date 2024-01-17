import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { WEB_PUSH_NAVIGATION_CHANNEL } from 'workers/types.d'

const log = console.debug

export const useAppNotifications = () => {
    const navigate = useNavigate()

    useEffect(() => {
        async function handleVisibilityChange() {
            if (isDocumentDefined() && document.visibilityState !== 'visible') {
                return // do nothing if the document is not visible
            }
            if (isNavigatorDefined()) {
                const registration = await navigator.serviceWorker.getRegistration()
                if (registration) {
                    const notifications = await registration.getNotifications()
                    if (notifications.length === 0) {
                        return
                    }
                    // double check that the document is visible before closing notifications
                    if (isDocumentDefined() && document.visibilityState === 'visible') {
                        for (const n of notifications) {
                            log('useAppNotifications:push: closing notification', n.tag)
                            n.close()
                        }
                    }
                }
            }
        }

        if (isDocumentDefined()) {
            document.onvisibilitychange = handleVisibilityChange
        }
        return () => {
            if (isDocumentDefined()) {
                document.onvisibilitychange = null
            }
        }
    }, [])

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

function isNavigatorDefined(): boolean {
    return typeof navigator !== 'undefined'
}

function isDocumentDefined(): boolean {
    return typeof document !== 'undefined'
}
