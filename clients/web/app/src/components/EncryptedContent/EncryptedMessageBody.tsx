import React from 'react'
import { RoomMessageEncryptedEvent } from 'use-towns-client'
import { Paragraph, Stack } from '@ui'
import { MESSAGING_IN_TOWNS_LINK } from 'data/links'
import { atoms } from 'ui/styles/atoms.css'

export const TimelineEncryptedContent = React.memo(
    (props: { event: { createdAtEpochMs: number }; content: RoomMessageEncryptedEvent }) => {
        const { content } = props

        return (
            <Stack>
                <Paragraph style={{ fontStyle: 'oblique' }} color="gray2">
                    {!content?.error || content.error.missingSession ? (
                        <>
                            Waiting for message to decrypt. This may take a while.{' '}
                            <a
                                href={MESSAGING_IN_TOWNS_LINK}
                                target="_blank"
                                rel="noreferrer"
                                className={atoms({ color: 'default' })}
                            >
                                Learn more
                            </a>
                            .
                        </>
                    ) : (
                        <>
                            This message failed to decrypt.
                            {getDecryptionError(props.content.error?.error)}
                        </>
                    )}
                </Paragraph>
            </Stack>
        )
    },
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
