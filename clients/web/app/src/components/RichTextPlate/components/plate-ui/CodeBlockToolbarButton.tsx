import React, { useCallback } from 'react'
import { useEditorRef, useEditorSelector } from '@udecode/plate-core'
import { getBlockAbove } from '@udecode/plate-common'
import { ELEMENT_CODE_LINE, toggleCodeBlock } from '@udecode/plate-code-block'
import { isType } from '@udecode/plate-utils'
import { IconButton } from '@ui'

export const CodeBlockToolbarButton = () => {
    const editor = useEditorRef()

    const isCodeBlockActive = useEditorSelector((_editor) => {
        return isType(editor, getBlockAbove(editor)?.[0], ELEMENT_CODE_LINE)
    }, [])

    const onClick = useCallback(() => {
        toggleCodeBlock(editor)
    }, [editor])

    return (
        <IconButton
            opaque
            active={isCodeBlockActive}
            icon="codeBlock"
            tooltip="Code block"
            tooltipOptions={{ placement: 'vertical', immediate: true }}
            onClick={onClick}
        />
    )
}
