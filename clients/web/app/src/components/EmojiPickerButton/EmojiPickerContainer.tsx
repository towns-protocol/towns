import data from '@emoji-mart/data'

import Picker from '@emoji-mart/react'
import React, { useCallback } from 'react'

import { Box } from '@ui'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { vars } from 'ui/styles/vars.css'
import { emojiPickerClassName } from './EmojiPickerContainer.css'

export const EmojiPickerContainer = (props: {
    onEmojiSelect: (data: EmojiPickerSelection) => void
}) => {
    const { closeCard } = useCardOpenerContext()

    const onEmojiSelect = useCallback(
        (data: EmojiPickerSelection) => {
            closeCard()
            props.onEmojiSelect(data)
        },
        [closeCard, props],
    )

    return (
        <Box className={emojiPickerClassName} insetX="xs" paddingTop="lg">
            <Picker
                autoFocus
                data={data}
                previewPosition="none"
                theme="dark"
                emojiButtonColors={[vars.color.background.level3]}
                onEmojiSelect={onEmojiSelect}
            />
        </Box>
    )
}
