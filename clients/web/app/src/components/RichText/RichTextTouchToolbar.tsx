import { AnimatePresence } from 'framer-motion'
import React from 'react'
import { GiphyEntryTouch } from '@components/Giphy/GiphyEntry'
import { EmojiPickerButtonTouch } from '@components/EmojiPickerButton'

type Props = {
    threadId?: string
    threadPreview?: string
    visible: boolean
}

export const RichTextTouchToolbar = (props: Props) => {
    return (
        <AnimatePresence>
            <GiphyEntryTouch
                key="giphy"
                threadId={props.threadId}
                threadPreview={props.threadPreview}
                showButton={props.visible}
            />
            <EmojiPickerButtonTouch key="emoji" showButton={props.visible} />
        </AnimatePresence>
    )
}
