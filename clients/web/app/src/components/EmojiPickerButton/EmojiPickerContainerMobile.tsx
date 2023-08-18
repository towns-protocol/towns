import data from '@emoji-mart/data'

import Picker from '@emoji-mart/react'
import React, { useCallback } from 'react'
import { Box, Stack } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { emojiPickerClassName } from './EmojiPickerContainer.css'

export const EmojiPickerContainerMobile = (props: {
    onEmojiSelect: (data: EmojiPickerSelection) => void
    onCancel: () => void
}) => {
    const onEmojiSelect = useCallback(
        (data: EmojiPickerSelection) => {
            props.onEmojiSelect(data)
            props.onCancel()
        },
        [props],
    )

    return (
        <Stack
            alignItems="center"
            position="fixed"
            top="none"
            bottom="none"
            left="none"
            right="none"
            paddingTop="safeAreaInsetTop"
            zIndex="tooltips"
        >
            <Box absoluteFill background="level1" opacity="0.5" onClick={props.onCancel} />
            <Box className={emojiPickerClassName} paddingTop="sm">
                <Picker
                    autoFocus
                    data={data}
                    previewPosition="none"
                    theme="dark"
                    emojiButtonColors={[vars.color.background.level3]}
                    onEmojiSelect={onEmojiSelect}
                />
            </Box>
        </Stack>
    )
}
