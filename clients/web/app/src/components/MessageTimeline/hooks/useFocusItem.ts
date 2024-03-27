import { useEffect, useRef, useState } from 'react'
import { FullyReadMarker } from '@river-build/proto'
import { ListItem } from '../types'

export const useFocusMessage = (
    listItems: ListItem[],
    highlightId: string | undefined,
    userId: string | undefined,
    fullyreadMarker: FullyReadMarker | undefined,
) => {
    const last = listItems[listItems.length - 1]

    const lastKey = last?.key

    const [focusItem, setFocusItem] = useState<FocusOption | undefined>(() =>
        highlightId
            ? {
                  key: highlightId,
                  align: 'start' as const,
                  sticky: true,
                  force: true,
              }
            : {
                  key: lastKey,
                  align: 'end' as const,
              },
    )

    const force =
        last?.type === 'message' &&
        last.item.event.sender.id === userId &&
        last.item.event.isLocalPending

    useEffect(() => {
        setFocusItem({
            key: lastKey,
            align: 'end' as const,
            force,
        })
    }, [lastKey, force])

    const fullyreadMarkerFocusedOnceRef = useRef(false)

    useEffect(() => {
        if (fullyreadMarker?.isUnread && !fullyreadMarkerFocusedOnceRef.current) {
            fullyreadMarkerFocusedOnceRef.current = true
            setFocusItem((f) => ({
                key: fullyreadMarker.eventId,
                align: 'start' as const,
                sticky: true,
                force: true,
                margin: 50,
            }))
        }
    }, [fullyreadMarker])

    useEffect(() => {
        if (highlightId) {
            setFocusItem((f) => ({
                key: highlightId,
                align: 'start' as const,
                sticky: true,
                force: true,
                margin: 50,
            }))
        }
    }, [highlightId])

    return { focusItem }
}
