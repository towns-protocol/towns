import React, { PropsWithChildren } from 'react'
import { AT_CHANNEL_MENTION } from 'use-towns-client'
import { Text } from '@ui'
import { TextProps } from 'ui/components/Text/Text'

export const ComboBoxTrailingContent = ({
    userId,
    isChannelMember,
}: PropsWithChildren<{ userId: string; isChannelMember: boolean }>) => {
    if (isChannelMember) {
        return null
    }
    const textConfig: { text: string; color: TextProps['color'] } = {
        text: '',
        color: 'gray2',
    }

    switch (userId) {
        case AT_CHANNEL_MENTION:
            textConfig.text = 'Notify everyone in channel'
            break

        default:
            textConfig.text = 'Not in channel'
    }

    return (
        <Text truncate color={textConfig.color}>
            {textConfig.text}
        </Text>
    )
}
