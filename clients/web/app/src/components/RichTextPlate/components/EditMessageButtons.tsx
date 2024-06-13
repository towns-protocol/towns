import React, { useCallback, useEffect } from 'react'
import { Button, Stack } from '@ui'
import { MotionIconButton } from 'ui/components/Motion/MotionComponents'
import { useDevice } from 'hooks/useDevice'

/**
 * Dispatches a mock Enter event to the active element (editor).
 * This is used in ExitComboboxPlugin.ts plugin to convert any unselected combobox item to a paragraph node.
 * E.g. :) or @ me
 *
 * Only required for touch devices, because on touch, we don't use Enter key to send the message.
 */
const dispatchMockEnterEvent = () => {
    const mockEnterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Enter',
        keyCode: 13,
    })
    document.activeElement?.dispatchEvent(mockEnterEvent)
}

export const EditMessageButtons = (props: {
    onSave?: () => void
    onCancel?: () => void
    isEditing: boolean
    isEditorEmpty: boolean
    hasImage: boolean
    verticalButtons?: boolean
    disabled?: boolean
}) => {
    const { isTouch } = useDevice()
    const { onCancel, onSave, isEditing, isEditorEmpty, hasImage, verticalButtons } = props

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
            if (isTouch) {
                dispatchMockEnterEvent()
                onSave?.()
            } else {
                // For desktop, we don't need to invoke onSave(), because we listen to 'Enter' key event in PlateEditor.tsx
                // Calling onSave() here will send the message twice
                dispatchMockEnterEvent()
            }
        },
        [onSave, isTouch],
    )

    const disabled = props.disabled || (isEditorEmpty && !hasImage)

    return (
        <Stack
            horizontal
            gap="sm"
            justifyContent={verticalButtons ? 'start' : 'end'}
            paddingX={isTouch ? 'none' : 'xs'}
        >
            {isEditing ? (
                <>
                    <Button size="button_xs" onMouseDown={cancelButtonPressed}>
                        Cancel
                    </Button>
                    <Button size="button_xs" tone="cta1" onMouseDown={saveButtonPressed}>
                        Save
                    </Button>
                </>
            ) : isTouch ? (
                <MotionIconButton
                    whileHover={
                        disabled
                            ? {}
                            : {
                                  opacity: 0.8,
                              }
                    }
                    icon={disabled ? 'touchSendDisabled' : 'touchSendEnabled'}
                    size="square_lg"
                    onMouseDown={disabled ? cancelButtonPressed : saveButtonPressed}
                />
            ) : (
                <MotionIconButton
                    whileHover={
                        disabled
                            ? {}
                            : {
                                  opacity: 0.8,
                              }
                    }
                    icon={disabled ? 'touchSendDisabled' : 'touchSendEnabled'}
                    size="square_md"
                    onMouseDown={disabled ? undefined : saveButtonPressed}
                />
            )}
        </Stack>
    )
}
