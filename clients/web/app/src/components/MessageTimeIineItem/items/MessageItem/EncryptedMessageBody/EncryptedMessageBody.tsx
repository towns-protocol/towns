import React from 'react'
import { TimelineEvent } from 'use-zion-client'
import { Box, Icon, Stack, Tooltip } from '@ui'
import * as styles from './EncryptedMessageBody.css'

export const TimelineEncryptedContent = React.memo(
    (props: { event: TimelineEvent; displayContext: 'tail' | 'body' | 'head' | 'single' }) => {
        const { event } = props

        const width = Math.min(
            (Math.floor((Math.cos(event.originServerTs / 1000) * 0.5 + 0.5) * 4) / 4) * 250 + 200,
            window.innerWidth - 100,
        )

        return (
            <Stack insetY="xxs" className={styles.main}>
                <Box
                    horizontal
                    centerContent
                    gap="sm"
                    style={{ width }}
                    tooltip={<DecryptionTooltip />}
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

const DecryptionTooltip = () => (
    <Tooltip centerContent gap="sm" width="250" textAlign="center">
        This message cannot be decrypted because you don&apos;t have this user&apos;s keys.
        <div className={styles.loader}>
            <div />
            <div />
            <div />
            <div />
        </div>
    </Tooltip>
)
