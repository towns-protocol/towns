import React from 'react'
import { Box, Icon, Stack, Text, Tooltip } from '@ui'
import * as styles from './EncryptedName.css'
import { loader } from './EncryptedMessageBody.css'

export const EncryptedName = (props: { message: string }) => {
    const { message } = props
    return (
        <Stack
            alignItems="center"
            background="level3"
            tooltip={<DecryptionTooltip />}
            className={styles.main}
            rounded="sm"
        >
            <Stack
                horizontal
                gap
                padding
                className={styles.hoverBackground}
                rounded="sm"
                width="100%"
                alignItems="center"
            >
                <Icon type="nokey" color="gray1" size="square_sm" />
                <Text size="sm" color="gray1">
                    {message}
                </Text>
                <Box grow />
            </Stack>
        </Stack>
    )
}

const DecryptionTooltip = () => (
    <Tooltip centerContent gap="sm" width="250" textAlign="center" background="level2">
        Requesting keys from your other devices and other members...
        <div className={loader}>
            <div />
            <div />
            <div />
            <div />
        </div>
    </Tooltip>
)
