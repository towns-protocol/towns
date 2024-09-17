import React, { useCallback } from 'react'
import type { PlateContentProps } from '@udecode/plate-common'
import { PlateContent, useEditorRef } from '@udecode/plate-common'
import { clsx } from 'clsx'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import * as styles from '../../RichTextEditor.css'

const inputClassName = clsx([fieldStyles.field, styles.richText, styles.contentEditable])

const Editor = React.forwardRef<
    HTMLDivElement,
    PlateContentProps & {
        handleSendOnEnter?: (e: React.KeyboardEvent<HTMLDivElement>) => void
        isTouch: boolean
        isEditorEmpty: boolean
        isEditing: boolean
    }
>(
    (
        {
            className,
            disabled,
            isEditorEmpty,
            isEditing,
            isTouch,
            readOnly,
            handleSendOnEnter,
            onKeyDown,
            ...props
        },
        ref,
    ) => {
        const editor = useEditorRef()
        /**
         * We need to make sure `onKeyDown` passed as `PlateContentProps` is called as well, to ensure default behavior is intact
         */
        const _onKeyDown = useCallback(
            (e: React.KeyboardEvent<HTMLDivElement>) => {
                /**
                 * Prevent the default behavior of backspace when the editor is empty
                 * This is to prevent the placeholder from flickering due to continuous state updates
                 */
                if (
                    !isTouch &&
                    e.key === 'Backspace' &&
                    editor.children.length === 1 &&
                    isEditorEmpty
                ) {
                    e.preventDefault()
                    return false
                }
                handleSendOnEnter?.(e)
                onKeyDown?.(e)
            },
            [onKeyDown, handleSendOnEnter, isEditorEmpty, isTouch, editor],
        )

        return (
            <PlateContent
                disableDefaultStyles
                className={clsx(inputClassName, {
                    [styles.contentEditablePWA]: isTouch,
                    [styles.editMode]: isEditing,
                })}
                readOnly={disabled || readOnly}
                aria-disabled={disabled}
                spellCheck={!isTouch}
                autoCapitalize="on"
                autoComplete="off"
                ref={ref}
                {...props}
                onKeyDown={_onKeyDown}
            />
        )
    },
)
Editor.displayName = 'Editor'

export { Editor }
