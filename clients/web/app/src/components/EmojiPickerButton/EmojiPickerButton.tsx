import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React, { useCallback, useState } from 'react'
import { Box, CardOpener, Icon, IconButton, IconProps, Pill } from '@ui'
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
                    <IconButton
                        icon="emojiAdd"
                        tooltip="Emoji"
                        tooltipOptions={{ placement: 'vertical', immediate: true }}
                        {...triggerProps}
                        size={size}
                    />
                </Container>
            )}
        </CardOpener>
    )
}

export const EmojiPickerButtonTouch = (props: {
    showButton: boolean
    onSelectEmoji: (data: EmojiPickerSelection) => void
}) => {
    const { showButton, onSelectEmoji } = props
    const [sheetVisible, setSheetVisible] = useState<boolean>(false)
    const [editor] = useLexicalComposerContext()

    const onCloseSheet = useCallback(() => {
        setSheetVisible(false)
        editor.focus()
    }, [setSheetVisible, editor])

    return (
        <>
            {showButton && (
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
