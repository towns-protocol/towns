import { useCallback, useEffect, useRef, useState } from 'react'
import { useFullyReadMarker, useTownsClient } from 'use-towns-client'
import { FullyReadMarker } from '@river/proto'
import { useStore } from 'store/store'

export const usePersistedUnreadMarkers = ({
    channelId,
    threadId,
}: {
    channelId: string
    threadId: string | undefined
}) => {
    let fullyReadMarker = useFullyReadMarker(channelId, threadId)
    // dismiss inactive fullyReadMarkers
    fullyReadMarker = fullyReadMarker?.isUnread ? fullyReadMarker : undefined
    // if a marker is shown once it will keep displaying until timeline gets
    // unmounted despite the marker flipping to unread
    const [fullreadMarkerPersisted, setFullyReadMarkerPersisted] = useState(() =>
        fullyReadMarker?.isUnread ? fullyReadMarker : undefined,
    )

    const initialMarkerRef = useRef(fullyReadMarker?.isUnread ? fullyReadMarker : undefined)

    const isWindowActive = useStore((state) => state.isWindowFocused)
    const isWindowActiveRef = useRef(isWindowActive)
    isWindowActiveRef.current = isWindowActive

    // a marker has been set by the user if it's both unread and has a date set
    const isManualUnreadMarker =
        fullyReadMarker?.isUnread &&
        fullyReadMarker.eventId !== initialMarkerRef.current?.eventId &&
        fullyReadMarker.markedReadAtTs === 0n

    useEffect(() => {
        if (!isWindowActiveRef.current || isManualUnreadMarker) {
            setFullyReadMarkerPersisted(fullyReadMarker)
            setIsUnreadMarkerFaded(false)
        }
    }, [fullyReadMarker, isManualUnreadMarker])

    const isSentRef = useRef(fullyReadMarker && !fullyReadMarker.isUnread)

    useEffect(() => {
        if (fullyReadMarker?.isUnread && !isManualUnreadMarker) {
            isSentRef.current = false
        }
    }, [fullyReadMarker?.isUnread, isManualUnreadMarker])

    const { sendReadReceipt } = useTownsClient()

    const hasUnreadMarker = !!fullreadMarkerPersisted
    const [isUnreadMarkerFaded, setIsUnreadMarkerFaded] = useState(false)

    useEffect(() => {
        if (hasUnreadMarker && isWindowActive) {
            const timeout = setTimeout(() => {
                setIsUnreadMarkerFaded(true)
            }, 3000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [hasUnreadMarker, isWindowActive])

    const onMarkAsRead = useCallback(
        (m: FullyReadMarker) => {
            if (isSentRef.current || isManualUnreadMarker) {
                // repeated calls can occur if server reponse is lagging and
                // user scrolls back into view
                return
            }
            sendReadReceipt(m)
            isSentRef.current = true
        },
        [isManualUnreadMarker, sendReadReceipt],
    )

    return {
        fullreadMarkerPersisted,
        fullyReadMarker,
        isUnreadMarkerFaded,
        onMarkAsRead,
    }
}
