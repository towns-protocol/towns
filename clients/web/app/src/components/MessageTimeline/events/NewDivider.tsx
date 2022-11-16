import React, { useCallback, useEffect } from 'react'
import { FullyReadMarker, useZionClient } from 'use-zion-client'
import { Box, Stack } from '@ui'

export const NewDivider = (props: { fullyReadMarker: FullyReadMarker }) => {
    const { fullyReadMarker } = props
    const { sendReadReceipt } = useZionClient()

    const markAsRead = useCallback(() => {
        sendReadReceipt(fullyReadMarker)
    }, [fullyReadMarker, sendReadReceipt])

    useEffect(() => {
        if (fullyReadMarker.isUnread) {
            const timeout = setTimeout(markAsRead, 100)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [markAsRead, fullyReadMarker.isUnread])

    const now = Date.now()
    const shouldRender =
        // as soon as (100ms) we see this marker, we mark it as read
        // but we don't want it flashing on and off
        // render if the fully read marker is unread and older than 10 seconds,
        // or read and unreadAt is older than N sec (for this example we'll use 10) and the mark as read is newer than M seconds (also using 10s)
        // case 1: click on channel with unread messages, get new messages
        //     | time = 1000s
        //     | isUnread = true, markedReadAt = 0s, markedUnread = 700s
        //     | shouldRender = true (marked unread is older than 10s)
        //     -> marked as read
        //     | time = 1001s
        //     | isUnread = false, markedReadAt = 1001s, markedUnread = 700s
        //     | shouldRender = true (marked unread is older than 10s, marked read is newer than 10s)
        //     -> wait 10s, leave and come back
        //     | time = 1011s
        //     | isUnread = false, markedReadAt = 1001s, markedUnread = 700s
        //     | shouldRender = false (marked unread is older than 10s, marked read is older than 10s)
        //     -> get a new message
        //     | time = 1012s
        //     | isUnread = true, markedReadAt = 1001s, markedUnread = 1012s
        //     | shouldRender = false (marked unread is newer than 10s)
        (fullyReadMarker.isUnread && now - fullyReadMarker.markedUnreadAtTs > 1000) ||
        (!fullyReadMarker.isUnread &&
            now - fullyReadMarker.markedUnreadAtTs > 1000 &&
            now - fullyReadMarker.markedReadAtTs < 4000)

    return shouldRender ? (
        <Stack position="relative" style={{ boxShadow: '0 0 1px #f000' }} height="x4">
            <Box left right top="md" position="absolute" paddingX="lg">
                <Box borderTop="negative" />
            </Box>
            <Box right display="block" position="absolute" zIndex="ui">
                <Box right>
                    <Box
                        paddingY="sm"
                        paddingX="md"
                        background="default"
                        color="negative"
                        fontSize="md"
                    >
                        New
                    </Box>
                </Box>
            </Box>
        </Stack>
    ) : null
}
