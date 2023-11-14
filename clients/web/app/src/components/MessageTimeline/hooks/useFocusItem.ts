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
              }
            : {
                  key: lastKey,
                  align: 'end' as const,
              },
    )

    const force =
        last?.type === 'message' &&
        last.item.event.sender.id === userId &&
        // TODO: we actually want to compare the message with the last message
        // sent by the user from the device.
        Date.now() - last.item.event.createdAtEpocMs < 1000 * 5

    useEffect(() => {
        setFocusItem({
            key: lastKey,
            align: 'end' as const,
            force: force,
        })
    }, [lastKey, force])

    return { focusItem }
}
