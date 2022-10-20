import { EmojiData } from 'emoji-mart'
import React from 'react'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { Stack } from '@ui'

export const RichTextEditorControls = (props: { onSelectEmoji: (data: EmojiData) => void }) => (
    <Stack horizontal gap="xs" color="gray2" alignItems="start" paddingY="sm">
        <EmojiPickerButton onSelectEmoji={props.onSelectEmoji} />
    </Stack>
)
