import React from 'react'
import { useEditorSelector } from '@udecode/plate-core'
import { isListRoot } from '@udecode/plate-list'
import { isSelectionAtCodeBlockStart } from '@udecode/plate-code-block'
import { Box } from '@ui'
import { isBlockquoteElement } from '../utils/helpers'

export const RichTextPlaceholder = ({
    placeholder,
}: React.PropsWithChildren<{ placeholder: string }>) => {
    const disablePlaceholder = useEditorSelector((editor) => {
        return (
            isListRoot(editor, editor.children[0]) ||
            isSelectionAtCodeBlockStart(editor) ||
            isBlockquoteElement(editor)
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
        >
            <Box as="p">{placeholder}</Box>
        </Box>
    )
}
