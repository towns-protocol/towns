import React, { useCallback } from 'react'
import { PlateContent, PlateContentProps } from '@udecode/plate-common/react'
import { clsx } from 'clsx'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { useDevice } from 'hooks/useDevice'
import * as styles from '../../RichTextEditor.css'

const inputClassName = clsx([fieldStyles.field, styles.richText, styles.contentEditable])

const Editor = React.forwardRef<
    HTMLDivElement,
    PlateContentProps & {
        customKeydownHandler?: (e: React.KeyboardEvent<HTMLDivElement>) => void
        hideAndroidPlaceholder?: () => void
        isEditing: boolean
    }
>(
    (
        {
            className,
            disabled,
            isEditing,
            readOnly,
            customKeydownHandler,
            onKeyDown,
            placeholder,
            hideAndroidPlaceholder,
            ...props
        },
        ref,
    ) => {
        const { isTouch, isAndroid } = useDevice()
        /**
         * We need to make sure `onKeyDown` passed as `PlateContentProps` is called as well, to ensure default behavior is intact
         */
        const _onKeyDown = useCallback(
            (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (isAndroid()) {
                    hideAndroidPlaceholder?.()
                }
                customKeydownHandler?.(e)
                onKeyDown?.(e)
            },
            [onKeyDown, customKeydownHandler, hideAndroidPlaceholder, isAndroid],
        )

        return (
            <div ref={ref}>
                <PlateContent
                    disableDefaultStyles
                    className={clsx(inputClassName, {
                        [styles.contentEditablePWA]: isTouch,
                        [styles.editMode]: isEditing,
                    })}
                    readOnly={disabled || readOnly}
                    aria-disabled={disabled}
                    spellCheck={!isTouch}
                    autoCapitalize="sentences"
                    autoComplete="off"
                    {...props}
                    /**
                     * @see showAndroidPlaceholder in `RichTextEditor.tsx` for why we need to conditionally pass placeholder
                     */
                    placeholder={isAndroid() ? undefined : placeholder}
                    onKeyDown={_onKeyDown}
                />
            </div>
        )
    },
)
Editor.displayName = 'Editor'

export { Editor }
