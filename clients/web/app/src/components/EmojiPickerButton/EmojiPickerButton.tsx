import React, { useCallback, useRef, useState } from 'react'
import { Box, BoxProps, CardOpener, Icon, IconButton, IconProps, Pill } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { useShortcut } from 'hooks/useShortcut'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import { EmojiPickerContainer } from './EmojiPickerContainer'
import { EmojiPickerContainerMobile } from './EmojiPickerContainerMobile'

type Props = {
    children?: React.ReactNode
    onSelectEmoji: (data: EmojiPickerSelection) => void
    size?: IconProps['size']
    tabIndex?: number
    pill?: boolean
    parentFocused?: boolean
    tooltip?: string | React.ReactNode
}

const PillContainer = (props: { children: React.ReactNode } & BoxProps) => (
    <Pill background="level1" color="level4" {...props} />
)

const DefaultContainer = (props: { children: React.ReactNode } & BoxProps) => <Box {...props} />

export const EmojiPickerButton = (props: Props) => {
    const { onSelectEmoji, size = 'square_sm', parentFocused = false } = props

    const Container = props.pill ? PillContainer : DefaultContainer

    const [showMobileEmojiSheet, setShowMobileEmojiSheet] = useState<boolean>(false)
    const { isTouch } = useDevice()

    const toggleCardRef = useRef<() => void>()

    useShortcut(
        'OpenEmojiPicker',
        () => {
            toggleCardRef.current?.()
        },
        { enabled: parentFocused },
        [parentFocused],
    )

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
            toggleRef={toggleCardRef}
            tabIndex={props.tabIndex}
            placement="vertical"
            render={
                <Box paddingY="lg">
                    <EmojiPickerContainer onEmojiSelect={onSelectEmoji} />
                </Box>
            }
        >
            {({ triggerProps }) => (
                <Container
                    tooltip={props.tooltip ?? <ShortcutTooltip action="OpenEmojiPicker" />}
                    tooltipOptions={{
                        placement: 'vertical',
                        immediate: true,
                    }}
                >
                    <IconButton icon="emojiAdd" {...triggerProps} size={size} />
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

    const onCloseSheet = useCallback(() => {
        setSheetVisible(false)
    }, [setSheetVisible])

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
