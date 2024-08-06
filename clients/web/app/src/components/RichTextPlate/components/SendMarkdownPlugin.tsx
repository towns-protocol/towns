import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Box, MotionBox } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { EditMessageButtons } from './EditMessageButtons'

export const SendMarkdownPlugin = (props: {
    disabled?: boolean
    displayButtons: 'always' | 'on-focus'
    focused: boolean
    isEditing: boolean
    hasImage: boolean
    sendMessage?: () => void
    onCancel?: () => void
    isEditorEmpty: boolean
}) => {
    const { disabled, sendMessage, isEditorEmpty, hasImage } = props

    const { isTouch } = useDevice()

    const size = useSizeContext()
    const verticalButtons = size.lessThan(350) && props.isEditing && !isTouch

    const shouldDisplayButtons =
        props.displayButtons === 'always' ||
        (props.displayButtons === 'on-focus' && (props.focused || !isEditorEmpty)) ||
        hasImage

    return (
        <AnimatePresence>
            <Box
                paddingY={verticalButtons ? undefined : 'sm'}
                paddingBottom={verticalButtons ? 'sm' : undefined}
                paddingRight="xs"
                flexBasis={verticalButtons ? '100%' : 'auto'}
            >
                {shouldDisplayButtons && (
                    <MotionBox
                        initial={isTouch ? { height: 0, opacity: 0 } : undefined}
                        exit={isTouch ? { height: 0, opacity: 0 } : undefined}
                        animate={isTouch ? { height: 'auto', opacity: 1 } : undefined}
                    >
                        <EditMessageButtons
                            isEditing={props.isEditing}
                            isEditorEmpty={isEditorEmpty}
                            hasImage={hasImage}
                            disabled={disabled}
                            verticalButtons={verticalButtons}
                            onCancel={props.onCancel}
                            onSave={sendMessage}
                        />
                    </MotionBox>
                )}
            </Box>
        </AnimatePresence>
    )
}
