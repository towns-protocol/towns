import React, { useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { GiphyEntryDesktop, GiphyEntryTouch } from '@components/Giphy/GiphyEntry'
import { EmojiPickerButton, EmojiPickerButtonTouch } from '@components/EmojiPickerButton'
import { useDevice } from 'hooks/useDevice'
import { Box, IconButton, Stack } from '@ui'
import { MotionIcon, MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { SpaceProtocol, useEnvironment } from 'hooks/useEnvironmnet'
import { $createEmojiNode } from './nodes/EmojiNode'

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
    const [editor] = useLexicalComposerContext()
    const mediaDropContext = useMediaDropContext()
    const { protocol } = useEnvironment()

    const {
        isFormattingToolbarOpen,
        setIsFormattingToolbarOpen,
        editing: isEditing = false,
        focused: isFocused = false,
    } = props

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

    const mediaInputId = 'media' + mediaDropContext.id

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

                    <EmojiPickerButton parentFocused={isFocused} onSelectEmoji={onSelectEmoji} />
                </>
            )}

            {protocol === SpaceProtocol.Casablanca && (
                <label htmlFor={mediaInputId}>
                    {props.visible && (
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
                        type="file"
                        name="image-file-input"
                        id={mediaInputId}
                        accept={isTouch ? 'image/*' : '*'}
                        style={{ display: 'none' }}
                        onChange={didSelectImages}
                    />
                </label>
            )}
        </Stack>
    )
}
