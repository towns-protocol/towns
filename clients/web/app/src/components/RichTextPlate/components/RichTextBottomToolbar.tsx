import React, { useCallback, useEffect, useId } from 'react'
import { focusEditor } from '@udecode/slate-react'
import { getEndPoint } from '@udecode/slate'
import { getSelectionText } from '@udecode/slate-utils'
import { useEditorRef, useEditorSelector, useEventEditorSelectors } from '@udecode/plate-common'
import { GiphyEntryDesktop, GiphyEntryTouch } from '@components/Giphy/GiphyEntry'
import { EmojiPickerButton, EmojiPickerButtonTouch } from '@components/EmojiPickerButton'
import { useDevice } from 'hooks/useDevice'
import { Box, IconButton, Stack } from '@ui'
import { MotionIcon, MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { SECOND_MS } from 'data/constants'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { ELEMENT_MENTION_EMOJI } from '../plugins/emoji/createEmojiPlugin'
import { TEmojiMentionElement } from '../utils/ComboboxTypes'

type Props = {
    threadId?: string
    threadPreview?: string
    visible: boolean
    editing?: boolean
    focused?: boolean
    isFormattingToolbarOpen: boolean
    setIsFormattingToolbarOpen: (isFormattingToolbarOpen: boolean) => void
}

export const RichTextBottomToolbar = (props: Props) => {
    const { isTouch } = useDevice()
    const editor = useEditorRef()
    // Debounced method to get selected text in editor
    const selectedText = useThrottledValue(useEditorSelector(getSelectionText, []), SECOND_MS)
    const mediaDropContext = useMediaDropContext()

    const {
        isFormattingToolbarOpen,
        setIsFormattingToolbarOpen,
        editing: isEditing = false,
        focused: isFocused = false,
    } = props

    /** Open formatting toolbar when user selects any text and keep it open */
    useEffect(() => {
        if (!isFormattingToolbarOpen && selectedText && selectedText.length > 0) {
            setTimeout(() => {
                const _selectedText = getSelectionText(editor)
                if (_selectedText && _selectedText.length > 0) {
                    setIsFormattingToolbarOpen(true)
                }
            }, SECOND_MS)
        }
    }, [editor, selectedText, setIsFormattingToolbarOpen, isFormattingToolbarOpen])

    const onSelectEmoji = useCallback(
        (data: EmojiPickerSelection) => {
            editor.insertNodes([
                {
                    type: ELEMENT_MENTION_EMOJI,
                    children: [{ text: '' }],
                    emoji: { name: data.name, emoji: data.native },
                    value: data.native,
                } as TEmojiMentionElement,
                { text: ' ' },
            ])
            focusEditor(editor, getEndPoint(editor, []))
        },
        [editor],
    )

    const onFormattingButtonClicked = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            setIsFormattingToolbarOpen(!isFormattingToolbarOpen)
            focusEditor(editor)
        },
        [setIsFormattingToolbarOpen, editor, isFormattingToolbarOpen],
    )

    const didSelectImages = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const fileList = event.target.files
            if (!fileList) {
                return
            }
            const files = Array.from(fileList)
            mediaDropContext.addFiles?.(files)
            event.target.value = ''
        },
        [mediaDropContext],
    )

    const mediaInputId = useId()

    return (
        <Stack horizontal gap={isTouch ? 'sm' : 'xs'} alignItems="center">
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
                            onMouseDown={onFormattingButtonClicked}
                        />
                    )}
                    {!isEditing && (
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
                    {!isEditing ? (
                        <GiphyEntryDesktop
                            parentFocused={isFocused}
                            threadId={props.threadId}
                            threadPreview={props.threadPreview}
                        />
                    ) : null}

                    <EmojiPickerButton
                        key="emoji-non-touch"
                        parentFocused={useEventEditorSelectors.focus() === editor.id && isFocused}
                        onSelectEmoji={onSelectEmoji}
                    />
                </>
            )}

            <label htmlFor={mediaInputId}>
                {(!isTouch || props.visible) && (
                    <Box
                        padding="xs"
                        tooltip={isTouch ? undefined : 'Upload file'}
                        tooltipOptions={{ immediate: true, placement: 'vertical' }}
                    >
                        <MotionIcon
                            type="attachment"
                            size="square_sm"
                            color={{ hover: 'default', default: 'gray2' }}
                            cursor="pointer"
                            initial={isTouch ? { opacity: 0 } : undefined}
                            animate={isTouch ? { opacity: 1 } : undefined}
                            exit={isTouch ? { opacity: 0 } : undefined}
                        />
                    </Box>
                )}
                <input
                    multiple
                    type="file"
                    name="file-input"
                    id={mediaInputId}
                    accept="*"
                    style={{ display: 'none' }}
                    onChange={didSelectImages}
                />
            </label>
        </Stack>
    )
}
