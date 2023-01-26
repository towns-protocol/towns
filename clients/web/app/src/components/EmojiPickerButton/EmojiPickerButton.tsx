import { EmojiData } from 'emoji-mart'
import React from 'react'
import { Box, IconButton, IconProps } from '@ui'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { EmojiPickerContainer } from './EmojiPickerContainer'

type Props = {
    children?: React.ReactNode
    onSelectEmoji: (data: EmojiData) => void
    size?: IconProps['size']
    tabIndex?: number
}

export const EmojiPickerButton = (props: Props) => {
    const { onSelectEmoji, size = 'square_sm' } = props
    return (
        <CardOpener
            tabIndex={props.tabIndex}
            placement="vertical"
            render={
                <Box paddingY="lg">
                    <EmojiPickerContainer onEmojiSelect={onSelectEmoji} />
                </Box>
            }
        >
            {({ triggerProps }) => (
                <IconButton icon="emoji" size={size} {...triggerProps} alignSelf="start" />
            )}
        </CardOpener>
    )
}
