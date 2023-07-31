import React, { useCallback, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import { Box, CardOpener, IconButton, IconProps } from '@ui'
import { $createEmojiNode } from '@components/RichText/nodes/EmojiNode'
import { MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { useDevice } from 'hooks/useDevice'
import { EmojiPickerContainer } from './EmojiPickerContainer'
import { EmojiPickerContainerMobile } from './EmojiPickerContainerMobile'

type Props = {
    children?: React.ReactNode
    onSelectEmoji: (data: EmojiPickerSelection) => void
    size?: IconProps['size']
    tabIndex?: number
}

export const EmojiPickerButton = (props: Props) => {
    const { onSelectEmoji, size = 'square_sm' } = props
    const [showMobileEmojiSheet, setShowMobileEmojiSheet] = useState<boolean>(false)
    const { isTouch } = useDevice()

    return isTouch ? (
        <>
            <IconButton
                icon="emoji"
                size={size}
                alignSelf="start"
                onClick={() => setShowMobileEmojiSheet(true)}
            />
            {showMobileEmojiSheet && (
                <EmojiPickerContainerMobile
                    onEmojiSelect={onSelectEmoji}
                    onCancel={() => {
                        setShowMobileEmojiSheet(false)
                    }}
                />
            )}
        </>
    ) : (
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

export const EmojiPickerButtonTouch = (props: { showButton: boolean }) => {
    const [editor] = useLexicalComposerContext()
    const [sheetVisible, setSheetVisible] = useState<boolean>(false)

    const onCloseSheet = useCallback(() => {
        setSheetVisible(false)
        editor.focus()
    }, [setSheetVisible, editor])

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
            setSheetVisible(false)
        },
        [editor, setSheetVisible],
    )

    return (
        <>
            {props.showButton && (
                <MotionIconButton
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    icon="emoji"
                    alignSelf="start"
                    onClick={() => setSheetVisible(true)}
                />
            )}
            {sheetVisible && (
                <EmojiPickerContainerMobile onEmojiSelect={onSelectEmoji} onCancel={onCloseSheet} />
            )}
        </>
    )
}
