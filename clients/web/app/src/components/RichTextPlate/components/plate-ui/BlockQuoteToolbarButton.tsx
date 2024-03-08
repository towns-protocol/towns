import React, { useCallback } from 'react'
import { useEditorRef, useEditorSelector } from '@udecode/plate-core'
import { ELEMENT_DEFAULT, getNodeString } from '@udecode/plate-common'
import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { IconButton } from '@ui'
import { getLowestBlockquoteNode, isBlockquoteElement, setNodeType } from '../../utils/helpers'

export const BlockQuoteToolbarButton = () => {
    const editor = useEditorRef()

    const isBlockQuoteActive = useEditorSelector((_editor) => {
        return isBlockquoteElement(_editor)
    }, [])

    const onClick = useCallback(() => {
        if (isBlockQuoteActive) {
            const blockQuoteNode = getLowestBlockquoteNode(editor)
            if (blockQuoteNode && getNodeString(blockQuoteNode).trim() === '') {
                setNodeType(editor, ELEMENT_DEFAULT)
            } else {
                editor.insertNode({ type: ELEMENT_DEFAULT, children: [{ text: '' }] })
            }
        } else {
            setNodeType(editor, ELEMENT_BLOCKQUOTE)
        }
    }, [editor, isBlockQuoteActive])

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
