import React, { useCallback } from 'react'
import { Mention } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { useEditorRef } from '@udecode/plate-common'
import { Box, MotionBox } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { toMD } from '../utils/toMD'
import { EditMessageButtons } from './EditMessageButtons'

export const SendMarkdownPlugin = (props: {
    disabled?: boolean
    displayButtons: 'always' | 'on-focus'
    focused: boolean
    isEditing: boolean
    hasImage: boolean
    onSend?: (value: string, mentions: Mention[]) => void
    onCancel?: () => void
    isEditorEmpty: boolean
}) => {
    const { disabled, onSend, isEditorEmpty, hasImage } = props
    const editor = useEditorRef()

    const { isTouch } = useDevice()

    const size = useSizeContext()
    const verticalButtons = size.lessThan(350) && props.isEditing && !isTouch

    const sendMessage = useCallback(async () => {
        const { message, mentions } = await toMD(editor)
        onSend?.(message, mentions)
    }, [editor, onSend])

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
                        layout="position"
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
