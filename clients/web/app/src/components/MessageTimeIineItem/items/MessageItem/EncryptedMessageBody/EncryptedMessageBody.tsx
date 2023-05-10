import React from 'react'
import { TimelineEvent } from 'use-zion-client'
import { Box, Card, Icon, Stack, TooltipRenderer } from '@ui'
import * as styles from './EncryptedMessageBody.css'

export const TimelineEncryptedContent = React.memo(
    (props: { event: TimelineEvent; displayContext: 'tail' | 'body' | 'head' | 'single' }) => {
        const { event } = props
        const width =
            (Math.floor((Math.cos(event.originServerTs / 1000) * 0.5 + 0.5) * 4) / 4) * 250 + 200
        return (
            <Stack insetY="xxs" className={styles.main}>
                <TooltipRenderer
                    tooltip={
                        <Card
                            border
                            centerContent
                            padding="sm"
                            gap="sm"
                            fontSize="sm"
                            rounded="sm"
                            width="250"
                            overflow="hidden"
                            textAlign="center"
                        >
                            This message cannot be decrypted because you don&apos;t have this
                            user&apos;s keys.
                            <div className={styles.loader}>
                                <div />
                                <div />
                                <div />
                                <div />
                            </div>
                        </Card>
                    }
                >
                    {({ triggerProps }) => (
                        <Box {...triggerProps} horizontal centerContent gap="sm" style={{ width }}>
                            <Box
                                grow
                                height="x2"
                                borderRadius="xs"
                                background="level2"
                                className={styles.hoverBackground}
                            />
                            <Icon
                                type="nokey"
                                size="square_sm"
                                className={styles.hoverColor}
                                color="level2"
                            />
                        </Box>
                    )}
                </TooltipRenderer>
            </Stack>
        )
    },
)
