import { EmojiData } from 'emoji-mart'
import React from 'react'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { Stack } from '@ui'
import { GiphyEntry } from '@components/Giphy/GiphyEntry'

export const RichTextEditorControls = (props: { onSelectEmoji: (data: EmojiData) => void }) => (
    <Stack horizontal gap="xs" color="gray2" alignItems="start" paddingY="sm">
        <GiphyEntry />
        <EmojiPickerButton onSelectEmoji={props.onSelectEmoji} />
    </Stack>
)
