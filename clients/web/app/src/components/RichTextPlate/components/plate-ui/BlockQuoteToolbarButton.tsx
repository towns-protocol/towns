import React, { useCallback } from 'react'
import { useEditorRef, useEditorSelector } from '@udecode/plate-common/react'
import { collapseSelection } from '@udecode/plate-common'
import { BaseBlockquotePlugin } from '@udecode/plate-block-quote'
import { IconButton } from '@ui'
import { isBlockquoteElement } from '../../utils/helpers'

export const BlockQuoteToolbarButton = () => {
    const editor = useEditorRef()

    const isBlockQuoteActive = useEditorSelector((_editor) => {
        return isBlockquoteElement(_editor)
    }, [])

    const onClick = useCallback(() => {
        editor.tf.toggle.block({ type: BaseBlockquotePlugin.key })
        collapseSelection(editor)
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
