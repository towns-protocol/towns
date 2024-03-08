import React from 'react'
import type { PlateContentProps } from '@udecode/plate-common'
import { PlateContent } from '@udecode/plate-common'
import { clsx } from 'clsx'
import { useEditorSelector } from '@udecode/plate-core'
import { isListRoot } from '@udecode/plate-list'
import { isSelectionAtCodeBlockStart } from '@udecode/plate-code-block'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import * as styles from '../../RichTextEditor.css'
import { isBlockquoteElement } from '../../utils/helpers'

const inputClassName = clsx([fieldStyles.field, styles.richText, styles.contentEditable])

const Editor = React.forwardRef<HTMLDivElement, PlateContentProps>(
    ({ className, disabled, readOnly, ...props }, ref) => {
        const disablePlaceholder = useEditorSelector((editor) => {
            return (
                isListRoot(editor, editor.children[0]) ||
                isSelectionAtCodeBlockStart(editor) ||
                isBlockquoteElement(editor)
            )
        }, [])

        return (
            <PlateContent
                disableDefaultStyles
                className={inputClassName}
                readOnly={disabled ?? readOnly}
                aria-disabled={disabled}
                {...props}
                placeholder={disablePlaceholder ? '' : props.placeholder}
            />
        )
    },
)
Editor.displayName = 'Editor'

export { Editor }
