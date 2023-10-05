import data from '@emoji-mart/data'

import Picker from '@emoji-mart/react'
import React, { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Box, Stack, useZLayerContext } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { emojiPickerClassName } from './EmojiPickerContainer.css'

export const EmojiPickerContainerMobile = (props: {
    onEmojiSelect: (data: EmojiPickerSelection) => void
    onCancel: () => void
}) => {
    const root = useZLayerContext().rootLayerRef?.current
    const onEmojiSelect = useCallback(
        (data: EmojiPickerSelection) => {
            props.onEmojiSelect(data)
            props.onCancel()
        },
        [props],
    )

    if (!root) {
        return undefined
    }

    return createPortal(
        <Stack
            alignItems="center"
            position="fixed"
            top="none"
            bottom="none"
            left="none"
            right="none"
            paddingTop="safeAreaInsetTop"
            pointerEvents="all"
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
        </Stack>,
        root,
    )
}
