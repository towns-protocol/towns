import React from 'react'
import { useEditorSelector } from '@udecode/plate-core/react'
import { isListRoot } from '@udecode/plate-list'
import { isSelectionAtCodeBlockStart } from '@udecode/plate-code-block'
import { Box } from '@ui'
import { getMentionInputElement, isBlockquoteElement } from '../utils/helpers'

export const RichTextPlaceholder = ({
    placeholder,
}: React.PropsWithChildren<{ placeholder: string }>) => {
    const disablePlaceholder = useEditorSelector((editor) => {
        return (
            isListRoot(editor, editor.children[0]) ||
            isSelectionAtCodeBlockStart(editor) ||
            isBlockquoteElement(editor) ||
            getMentionInputElement(editor)
        )
    }, [])

    if (disablePlaceholder) {
        return null
    }

    return (
        <Box
            absoluteFill
            display="block"
            pointerEvents="none"
            color="gray2"
            justifyContent="center"
            padding="md"
            data-testid="editor-placeholder"
        >
            <Box as="p">{placeholder}</Box>
        </Box>
    )
}
