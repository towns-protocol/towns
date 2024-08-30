import React, { useCallback } from 'react'
import { useEditorRef, useEditorSelector } from '@udecode/plate-core'
import { ELEMENT_DEFAULT, collapseSelection, toggleNodeType } from '@udecode/plate-common'
import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { getEndPoint } from '@udecode/slate'
import { focusEditor } from '@udecode/slate-react'
import { IconButton } from '@ui'
import { isBlockquoteElement } from '../../utils/helpers'

export const BlockQuoteToolbarButton = () => {
    const editor = useEditorRef()

    const isBlockQuoteActive = useEditorSelector((_editor) => {
        return isBlockquoteElement(_editor)
    }, [])

    const onClick = useCallback(() => {
        toggleNodeType(editor, { activeType: ELEMENT_BLOCKQUOTE, inactiveType: ELEMENT_DEFAULT })
        collapseSelection(editor)
        focusEditor(editor, getEndPoint(editor, []))
    }, [editor])

    return (
        <IconButton
            opaque
            active={isBlockQuoteActive}
            icon="blockquote"
            tooltip="Block quote"
            tooltipOptions={{ placement: 'vertical', immediate: true }}
            onClick={onClick}
        />
    )
}
