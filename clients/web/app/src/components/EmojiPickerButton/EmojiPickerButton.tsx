import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection } from 'lexical'
import React, { useCallback, useState } from 'react'
import { $createEmojiNode } from '@components/RichText/nodes/EmojiNode'
import { Box, CardOpener, Icon, IconProps, Pill } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { EmojiPickerContainer } from './EmojiPickerContainer'
import { EmojiPickerContainerMobile } from './EmojiPickerContainerMobile'

type Props = {
    children?: React.ReactNode
    onSelectEmoji: (data: EmojiPickerSelection) => void
    size?: IconProps['size']
    tabIndex?: number
    pill?: boolean
}

const PillContainer = (props: { children: React.ReactNode }) => (
    <Pill background="level1" color="level4">
        {props.children}
    </Pill>
)

const DefaultContainer = (props: { children: React.ReactNode }) => props.children

export const EmojiPickerButton = (props: Props) => {
    const { onSelectEmoji, size = 'square_sm' } = props

    const Container = props.pill ? PillContainer : DefaultContainer

    const [showMobileEmojiSheet, setShowMobileEmojiSheet] = useState<boolean>(false)
    const { isTouch } = useDevice()

    return isTouch ? (
        <>
            <Container>
                <Icon type="emojiAdd" size={size} onClick={() => setShowMobileEmojiSheet(true)} />
            </Container>

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
                <Container>
                    <Icon type="emojiAdd" {...triggerProps} size={size} />
                </Container>
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
