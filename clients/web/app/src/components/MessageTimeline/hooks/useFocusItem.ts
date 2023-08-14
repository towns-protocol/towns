import { useMemo } from 'react'
import { ListItem } from '../types'

export const useFocusMessage = (
    listItems: ListItem[],
    highlightId: string | undefined,
    userId: string | undefined,
) => {
    const last = listItems[listItems.length - 1]

    const force =
        last?.type === 'message' &&
        last.item.event.sender.id === userId &&
        // TODO: we actually want to compare the message with the last message
        // sent by the user from the device.
        Date.now() - last.item.event.originServerTs < 1000 * 5

    const lastKey = last?.id

    const focusItem = useMemo<FocusOption | undefined>(
        () =>
            highlightId
                ? {
                      key: highlightId,
                      align: 'start' as const,
                  }
                : {
                      key: lastKey,
                      align: 'end' as const,
                      force,
                  },

        [lastKey, force, highlightId],
    )

    return { focusItem }
}
