import { useEffect, useState } from 'react'
import { ListItem } from '../types'

export const useFocusMessage = (
    listItems: ListItem[],
    highlightId: string | undefined,
    userId: string | undefined,
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
        if (highlightId) {
            setFocusItem((f) => ({
                key: highlightId,
                align: 'start' as const,
                sticky: true,
                force: true,
            }))
        }
    }, [highlightId])

    useEffect(() => {
        setFocusItem({
            key: lastKey,
            align: 'end' as const,
            force,
        })
    }, [lastKey, force])

    return { focusItem }
}
