import React from 'react'
import { Box, Icon, Stack, Text, Tooltip } from '@ui'

export const DecryptionDebugger = (props: {
    sessionId: string
    eventId: string
    timestamp?: number
}) => {
    const { sessionId, eventId, timestamp } = props

    return (
        <Box
            tooltipOptions={{ trigger: 'click', placement: 'horizontal' }}
            tooltip={
                <Tooltip>
                    <Stack
                        gap
                        rounded="md"
                        background="level1"
                        style={{ wordWrap: 'break-word' }}
                        pointerEvents="all"
                    >
                        {timestamp && (
                            <Text fontSize="sm" textAlign="center">
                                <strong>Timestamp</strong>
                                <br />
                                {new Date(timestamp).toISOString()}
                            </Text>
                        )}
                        <Text textAlign="center" fontSize="sm">
                            <strong>EventID</strong> {eventId}
                        </Text>
                        <Text textAlign="center" fontSize="sm">
                            <strong>Encrypted with Session ID</strong> {sessionId}
                        </Text>
                    </Stack>
                </Tooltip>
            }
        >
            <Icon type="help" size="square_xs" />
        </Box>
    )
}
