import React from 'react'
import { useNetworkStatus } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { Icon, Paragraph } from '@ui'
import { FadeInBox } from '@components/Transitions'

export const OfflineIndicator = (props: { attemptingToSend?: boolean }) => {
    const { isOffline } = useNetworkStatus()
    let message = 'Your connection appears to be offline.'
    if (props.attemptingToSend) {
        message = [message, 'Please try again when back online...'].join(' ')
    }
    return (
        <AnimatePresence>
            {isOffline ? (
                <FadeInBox
                    horizontal
                    paddingX
                    paddingBottom="sm"
                    key={message}
                    gap="xs"
                    color="error"
                    alignItems="center"
                >
                    <Icon type="offline" size="square_sm" />
                    <Paragraph size="sm">{message}</Paragraph>
                </FadeInBox>
            ) : null}
        </AnimatePresence>
    )
}
