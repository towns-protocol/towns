import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FullyReadMarker } from '@river-build/proto'
import { create } from 'zustand'
import { useLocation } from 'react-router'
import { ListItem } from '../types'
import { ScrollbackState } from './useScrollback'

/** Global state for focusing on a message in the message timeline.
 * @desc Keep in mind that the message will only be focused if you're in the MessageTimeline where the message is.
 */
const useFocusMessage = create<{
    focusItem: { type: 'new' | 'forced'; id: string }
    actions: {
        setFocusItem: (id: string, type: 'new' | 'forced') => void
    }
}>((set) => ({
    focusItem: { type: 'new', id: '' },
    actions: {
        setFocusItem: (id, type) => set({ focusItem: { id, type } }),
    },
}))

export const useFocusItem = (
    listItems: ListItem[],
    highlightId: string | undefined,
    userId: string | undefined,
    fullyreadMarker: FullyReadMarker | undefined,
) => {
    // there's no need to focus on a message that doesn't exist
    const validHighlightId = listItems.find((e) => e.key === highlightId)?.key

    const { focusItem: storeFocus } = useFocusMessage()
    const last = listItems[listItems.length - 1]

    const lastKey = last?.key

    const [focusItem, setFocusItem] = useState<FocusOption | undefined>(() =>
        validHighlightId
            ? {
                  key: validHighlightId,
                  align: 'start' as const,
                  sticky: true,
                  force: true,
              }
            : {
                  key: lastKey,
                  align: 'end' as const,
              },
    )

    useLayoutEffect(() => {
        const isForced = storeFocus.type === 'forced'
        setFocusItem({
            key: storeFocus.id,
            align: isForced ? 'start' : 'end',
            sticky: true,
            force: isForced,
            margin: isForced ? 50 : 0,
        })
    }, [storeFocus])

    const force =
        last?.type === 'message' &&
        last.item.event.sender.id === userId &&
        last.item.event.isLocalPending

    useLayoutEffect(() => {
        setFocusItem({
            key: lastKey,
            align: 'end' as const,
            force,
        })
    }, [lastKey, force])

    const fullyreadMarkerFocusedOnceRef = useRef(false)

    useLayoutEffect(() => {
        if (fullyreadMarker?.isUnread && !fullyreadMarkerFocusedOnceRef.current) {
            fullyreadMarkerFocusedOnceRef.current = true
            setFocusItem({
                key: fullyreadMarker.eventId,
                align: 'start' as const,
                sticky: true,
                force: true,
                margin: 50,
            })
        }
    }, [fullyreadMarker])

    useLayoutEffect(() => {
        if (validHighlightId) {
            setFocusItem({
                key: validHighlightId,
                align: 'start' as const,
                sticky: true,
                force: true,
                margin: 50,
            })
        }
    }, [validHighlightId])

    return { focusItem }
}

/**
 * if a message is highlighted (via anchor link or open thread) we get it into
 * the viewport and may not to apply scrollbacks to achieve this
 */
export const useScrollbackToFocusItem = (
    highlightId: string | undefined,
    listItems: { eventId: string }[],
    scrollbackState: ScrollbackState,
    onFirstMessageReached: (watermark: string) => void,
) => {
    const watermark = scrollbackState?.firstEventId
    const terminus = scrollbackState?.terminus
    useEffect(() => {
        if (highlightId && watermark && !terminus) {
            const found = listItems.some((s) => s.eventId === highlightId)
            if (!found) {
                // note: the callback can be invoked repeatedly but will only
                // have an effect if the watermark changes
                onFirstMessageReached(watermark)
            }
        }
    }, [highlightId, listItems, onFirstMessageReached, terminus, watermark])
}

type MessageLink =
    | { type: 'same-channel-message'; focusMessage: () => void }
    | { type: 'internal-link'; path: string }
    | {
          type: 'external'
          link: string
      }
    | { type: undefined; link: undefined }

// Suggested usage:
// If its on the same channel, focus the message
// If its in a different channel, change the route
// If its a external link, open it in a new tab
export const useMessageLink = (href: string | undefined): MessageLink => {
    const location = useLocation()
    const { setFocusItem } = useFocusMessage((s) => s.actions)

    return useMemo(() => {
        if (!href) {
            return { type: undefined, link: undefined }
        }
        let url = null

        try {
            url = new URL(href)
        } catch (_error) {
            return { type: undefined, link: undefined }
        }

        if (url.hostname !== window.location.hostname) {
            return { type: 'external', link: href }
        }

        // remove the / from the end of the pathname
        const locationPathname = location.pathname.endsWith('/')
            ? location.pathname.slice(0, -1)
            : location.pathname
        const urlPathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname

        if (urlPathname === locationPathname && url.hash) {
            const messageId = url.hash.slice(1) // remove the # from the hash
            return {
                type: 'same-channel-message',
                focusMessage: () => setFocusItem(messageId, 'forced'),
            }
        }

        return { type: 'internal-link', path: url.pathname + url.hash }
    }, [href, location.pathname, setFocusItem])
}
