import React from 'react'
import { RoomMessageEncryptedEvent } from 'use-towns-client'
import { Box, Icon, Stack, Tooltip } from '@ui'
import * as styles from './EncryptedMessageBody.css'

export const TimelineEncryptedContent = React.memo(
    (props: { event: { createdAtEpochMs: number }; content: RoomMessageEncryptedEvent }) => {
        const { event, content } = props

        const width = Math.min(
            (Math.floor((Math.cos(event.createdAtEpochMs / 1000) * 0.5 + 0.5) * 4) / 4) * 250 + 200,
            window.innerWidth - 100,
        )

        return (
            <Stack className={styles.main}>
                <Box
                    horizontal
                    centerContent
                    gap="sm"
                    style={{ width: `min(${width}px, 100%)` }}
                    tooltip={<DecryptionTooltip content={content} />}
                >
                    <Box
                        grow
                        height="x2"
                        borderRadius="xs"
                        background="level3"
                        className={styles.hoverBackground}
                    />
                    <Icon
                        type="nokey"
                        size="square_sm"
                        className={styles.hoverColor}
                        color="level3"
                    />
                </Box>
            </Stack>
        )
    },
)

const DecryptionTooltip = (props: { content: RoomMessageEncryptedEvent }) => (
    <Tooltip centerContent gap="sm" width="250" textAlign="center">
        {props.content.error === undefined
            ? 'Decrypting...'
            : props.content.error.missingSession
            ? 'Requesting keys from your other devices and/or other members...'
            : `This message failed to decrypt. ${getDecryptionError(props.content.error?.error)}`}

        <div className={styles.loader}>
            <div />
            <div />
            <div />
            <div />
        </div>
    </Tooltip>
)

function getDecryptionError(err?: unknown): string {
    if (err !== null && err !== undefined) {
        if (err instanceof Error) {
            return err.message
        }
        if (typeof err === 'string') {
            return err
        }
        if (typeof err === 'object' && 'message' in err) {
            return err.message as string
        }
        if (typeof err === 'object') {
            return JSON.stringify(err)
        }
    }
    return ''
}
