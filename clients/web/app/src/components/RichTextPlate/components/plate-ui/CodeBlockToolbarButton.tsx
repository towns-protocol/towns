import React, { useCallback } from 'react'
import { useEditorRef, useEditorSelector } from '@udecode/plate-core/react'
import { toggleCodeBlock } from '@udecode/plate-code-block'
import {
    BaseBulletedListPlugin,
    BaseNumberedListPlugin,
    someList,
    unwrapList,
} from '@udecode/plate-list'
import { IconButton } from '@ui'
import { isCodeBlockElement } from '../../utils/helpers'

export const CodeBlockToolbarButton = () => {
    const editor = useEditorRef()

    const isCodeBlockActive = useEditorSelector((_editor) => {
        return isCodeBlockElement(editor)
    }, [])

    const onClick = useCallback(() => {
        if (
            someList(editor, BaseNumberedListPlugin.key) ||
            someList(editor, BaseBulletedListPlugin.key)
        ) {
            unwrapList(editor)
        }
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
