import React, { useCallback } from 'react'
import { useZionClient } from 'use-zion-client'
import { Box, Button, Icon, Stack, Text, Tooltip } from '@ui'

export const DecryptionDebugger = (props: {
    sessionId: string
    eventId: string
    timestamp?: number
}) => {
    const { sessionId, eventId, timestamp } = props
    const { client } = useZionClient()
    const buttonPressed = useCallback(async () => {
        await client?.retryMegolmDecryption(eventId)
    }, [client, eventId])

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
                        <Button tone="cta1" size="button_sm" onClick={buttonPressed}>
                            Retry
                        </Button>
                    </Stack>
                </Tooltip>
            }
        >
            <Icon type="help" size="square_xs" />
        </Box>
    )
}
