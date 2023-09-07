import React, { useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { GiphyEntryDesktop, GiphyEntryTouch } from '@components/Giphy/GiphyEntry'
import { EmojiPickerButton, EmojiPickerButtonTouch } from '@components/EmojiPickerButton'
import { useDevice } from 'hooks/useDevice'
import { Box, IconButton, Stack } from '@ui'
import { MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { $createEmojiNode } from './nodes/EmojiNode'

type Props = {
    threadId?: string
    threadPreview?: string
    visible: boolean
    editing?: boolean
    isFormattingToolbarOpen: boolean
    setIsFormattingToolbarOpen: (isFormattingToolbarOpen: boolean) => void
}

export const RichTextBottomToolbar = (props: Props) => {
    const { isTouch } = useDevice()
    const [editor] = useLexicalComposerContext()

    const { isFormattingToolbarOpen, setIsFormattingToolbarOpen, editing = false } = props

    const onSelectEmoji = useCallback(
        (data: EmojiPickerSelection) => {
            editor.focus()
            editor.update(() => {
                const selection = $getSelection()
                const emojiNode = $createEmojiNode('', data.native)
                if ($isRangeSelection(selection)) {
                    selection.insertNodes([emojiNode])
                }
            })
        },
        [editor],
    )

    const onFormattingButtonClicked = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            setIsFormattingToolbarOpen(!isFormattingToolbarOpen)
            editor.focus()
        },
        [setIsFormattingToolbarOpen, editor, isFormattingToolbarOpen],
    )

    return (
        <Stack horizontal gap="xs" alignItems="center">
            {isTouch ? (
                <>
                    {props.visible && (
                        <MotionIconButton
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            icon="text"
                            alignSelf="start"
                            active={false}
                            onClick={onFormattingButtonClicked}
                        />
                    )}
                    {!editing && (
                        <GiphyEntryTouch
                            key="giphy"
                            threadId={props.threadId}
                            threadPreview={props.threadPreview}
                            showButton={props.visible}
                        />
                    )}
                    <EmojiPickerButtonTouch
                        key="emoji"
                        showButton={props.visible}
                        onSelectEmoji={onSelectEmoji}
                    />
                </>
            ) : (
                <>
                    <IconButton
                        icon="text"
                        active={false}
                        tooltip="Formatting"
                        tooltipOptions={{ placement: 'vertical', immediate: true }}
                        onClick={onFormattingButtonClicked}
                    />
                    {!editing ? (
                        <Box
                            tooltip="Giphy"
                            tooltipOptions={{ placement: 'vertical', immediate: true }}
                        >
                            <GiphyEntryDesktop
                                threadId={props.threadId}
                                threadPreview={props.threadPreview}
                            />
                        </Box>
                    ) : null}
                    <Box
                        tooltip="Emoji"
                        tooltipOptions={{ placement: 'vertical', immediate: true }}
                    >
                        <EmojiPickerButton onSelectEmoji={onSelectEmoji} />
                    </Box>
                </>
            )}
        </Stack>
    )
}
