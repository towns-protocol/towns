import React, { useCallback } from 'react'
import type { PlateContentProps } from '@udecode/plate-common'
import { PlateContent } from '@udecode/plate-common'
import { clsx } from 'clsx'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import * as styles from '../../RichTextEditor.css'

const inputClassName = clsx([fieldStyles.field, styles.richText, styles.contentEditable])

const Editor = React.forwardRef<
    HTMLDivElement,
    PlateContentProps & {
        handleSendOnEnter?: (e: React.KeyboardEvent<HTMLDivElement>) => void
        isTouch: boolean
    }
>(({ className, disabled, isTouch, readOnly, handleSendOnEnter, onKeyDown, ...props }, ref) => {
    /**
     * We need to make sure `onKeyDown` passed as `PlateContentProps` is called as well, to ensure default behavior is intact
     */
    const _onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            handleSendOnEnter?.(e)
            onKeyDown?.(e)
        },
        [onKeyDown, handleSendOnEnter],
    )

    return (
        <PlateContent
            disableDefaultStyles
            className={clsx(inputClassName, {
                [styles.contentEditablePWA]: isTouch,
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
})
Editor.displayName = 'Editor'

export { Editor }
