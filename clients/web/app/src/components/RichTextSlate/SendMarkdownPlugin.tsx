import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Button, Icon, MotionBox, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'

export const SendMarkdownPlugin = (props: {
    disabled?: boolean
    displayButtons: 'always' | 'on-focus'
    focused: boolean
    isEditing: boolean
    hasImage: boolean
    onSend?: () => void
    onSendAttemptWhileDisabled?: () => void
    onCancel?: () => void
    isEditorEmpty: boolean
    setIsEditorEmpty: (isEditorEmpty: boolean) => void
}) => {
    const { disabled, onSend, isEditorEmpty, hasImage } = props

    // const { parseMarkdown } = useParseMarkdown(onSend)
    const { isTouch } = useDevice()

    // the following is hack makes the command fire last in the queue of
    // LOW_PRIORITY_COMMANDS allowing commands on the same priority to fire
    // first. Specifically, for the typeahead plugin requiring ENTER to make a selection.
    const [, setRegisterCommandCount] = useState(0)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                setRegisterCommandCount((b) => b + 1)
            }
        }
        window.addEventListener('keydown', onKey, { capture: true })
        return () => {
            window.removeEventListener('keydown', onKey, { capture: true })
        }
    }, [])

    const editorEmptyRef = useRef(isEditorEmpty)
    editorEmptyRef.current = isEditorEmpty

    const sendMessage = useCallback(() => {
        onSend?.()
    }, [onSend])

    const shouldDisplayButtons =
        props.displayButtons === 'always' ||
        (props.displayButtons === 'on-focus' && (props.focused || !isEditorEmpty)) ||
        hasImage

    return (
        <AnimatePresence>
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
                        onCancel={props.onCancel}
                        onSave={sendMessage}
                    />
                </MotionBox>
            )}
        </AnimatePresence>
    )
}

const EditMessageButtons = (props: {
    onSave?: () => void
    onCancel?: () => void
    isEditing: boolean
    isEditorEmpty: boolean
    hasImage: boolean
    disabled?: boolean
}) => {
    const { isTouch } = useDevice()
    const { onCancel, onSave, isEditing, isEditorEmpty, hasImage } = props

    useEffect(() => {
        if (!onCancel) {
            return
        }

        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onCancel?.()
            }
        }

        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
        }
    }, [onCancel])

    const cancelButtonPressed = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            onCancel?.()
        },
        [onCancel],
    )

    const saveButtonPressed = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            onSave?.()
        },
        [onSave],
    )

    const disabled = props.disabled || (isEditorEmpty && !hasImage)

    return (
        <Stack horizontal gap paddingX={isTouch ? 'none' : 'xs'}>
            {isEditing ? (
                <>
                    <Button size="button_xs" onClick={cancelButtonPressed}>
                        Cancel
                    </Button>
                    <Button size="button_xs" tone="cta1" onClick={saveButtonPressed}>
                        Save
                    </Button>
                </>
            ) : isTouch ? (
                <Icon
                    type={disabled ? 'touchSendDisabled' : 'touchSendEnabled'}
                    size="square_lg"
                    onClick={disabled ? props.onCancel : props.onSave}
                />
            ) : (
                <Icon
                    type={disabled ? 'touchSendDisabled' : 'touchSendEnabled'}
                    size="square_md"
                    onClick={disabled ? undefined : props.onSave}
                />
            )}
        </Stack>
    )
}
