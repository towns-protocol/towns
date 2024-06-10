import { useCallback, useEffect, useRef, useState } from 'react'
import { useFullyReadMarker, useTownsClient } from 'use-towns-client'
import { FullyReadMarker } from '@river-build/proto'
import { create } from 'zustand'
import { useStore } from 'store/store'
import { SECOND_MS } from 'data/constants'

// utility to keep track of manually set unread markers
// an alternative would be to add a flag on the fullyReadMarker to define wether
// or not it was set manually or not
export const markAsUnreadStore = create<{ manualUnreads: Set<string> }>((set) => ({
    manualUnreads: new Set(),
    setManualUnreads: (eventId: string) =>
        set((state) => {
            state.manualUnreads.add(eventId)
            return { ...state, manualUnreads: new Set(state.manualUnreads) }
        }),
}))

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

    // keep track of the marker that was initially shown when openeing the channel

    const initialMarkerRef = useRef(fullyReadMarker?.isUnread ? fullyReadMarker : undefined)

    // if a marker is shown once it will keep displaying until timeline gets
    // unmounted despite the marker flipping to unread

    const [fullreadMarkerPersisted, setFullyReadMarkerPersisted] = useState(() =>
        fullyReadMarker?.isUnread ? fullyReadMarker : undefined,
    )

    const manualUnreads = markAsUnreadStore((s) => s.manualUnreads)

    // we need to isolate markers that have been set manually in order to not
    // set them as unread unless you come back to the channel

    const isManualUnreadMarker =
        fullyReadMarker?.isUnread &&
        manualUnreads.has(fullyReadMarker.eventId) &&
        initialMarkerRef.current?.eventId !== fullyReadMarker?.eventId

    // we only show unread makers if the window is inactive or when the user
    // has manually set a message as unread

    const isWindowActive = useStore((state) => state.isWindowFocused)
    const isWindowActiveRef = useRef(isWindowActive)
    isWindowActiveRef.current = isWindowActive

    useEffect(() => {
        if (!isWindowActiveRef.current || isManualUnreadMarker) {
            setFullyReadMarkerPersisted(fullyReadMarker)
            setIsUnreadMarkerFaded(false)
        }
    }, [fullyReadMarker, isManualUnreadMarker])

    // if the message is read we fade the marker after a certain time

    const isRead = fullreadMarkerPersisted && !fullyReadMarker?.isUnread
    const [isUnreadMarkerFaded, setIsUnreadMarkerFaded] = useState(false)
    useEffect(() => {
        if (isRead) {
            const timeout = setTimeout(() => {
                setIsUnreadMarkerFaded(true)
            }, SECOND_MS * 2)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isRead])

    // when a maker is set as read we sync the state with the backend

    const isSentRef = useRef(fullyReadMarker && !fullyReadMarker.isUnread)
    useEffect(() => {
        if (fullyReadMarker?.isUnread && !isManualUnreadMarker) {
            isSentRef.current = false
        }
    }, [fullyReadMarker?.isUnread, isManualUnreadMarker])

    const { sendReadReceipt } = useTownsClient()

    const onMarkAsRead = useCallback(
        (m: FullyReadMarker) => {
            if (
                isSentRef.current ||
                // the manual marker needs to be cleared when entering the
                // channel a second time around
                isManualUnreadMarker
            ) {
                // repeated calls can occur if server reponse is lagging and
                // user scrolls back into view
                return
            }

            sendReadReceipt(m)

            isSentRef.current = true

            // start fresh
            initialMarkerRef.current = undefined
            markAsUnreadStore.setState((s) => {
                const manualUnreads = new Set(s.manualUnreads)
                s.manualUnreads.delete(m.eventId)
                return {
                    manualUnreads,
                }
            })
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
