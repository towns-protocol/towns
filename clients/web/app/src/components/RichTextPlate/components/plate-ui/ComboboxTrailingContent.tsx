import React, { PropsWithChildren } from 'react'
import { AT_CHANNEL_MENTION } from 'use-towns-client'
import { BoxProps, Text } from '@ui'

export const ComboBoxTrailingContent = ({
    userId,
    isChannelMember,
}: PropsWithChildren<{ userId: string; isChannelMember: boolean }>) => {
    if (isChannelMember) {
        return null
    }
    const textConfig: { text: string; color: BoxProps['color'] } = {
        text: '',
        color: 'gray2',
    }

    switch (userId) {
        case AT_CHANNEL_MENTION:
            textConfig.text = 'Notify everyone in this channel'
            textConfig.color = 'gray2'
            break

        default:
            textConfig.text = 'Not in channel'
            textConfig.color = 'error'
    }

    return (
        <Text truncate color={textConfig.color}>
            {textConfig.text}
        </Text>
    )
}
