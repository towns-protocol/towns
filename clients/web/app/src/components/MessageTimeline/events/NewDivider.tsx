import React, { useCallback, useEffect } from 'react'
import { FullyReadMarker, useZionClient } from 'use-zion-client'
import { Box } from '@ui'

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

    return (
        <>
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
        </>
    )
}
