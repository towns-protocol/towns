import React, { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $isTextNode } from 'lexical'
import { Box } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { RichTextToolbar, getSelectedNode } from './RichTextToolbar'

export const InlineToolbar = (props: {
    onAddLinkClick: () => void
    onClose: () => void
    position:
        | undefined
        | {
              top: number
              left: number | string
          }
}) => {
    const [isText, setIsText] = useState(false)
    const [editor] = useLexicalComposerContext()

    const updateToolbar = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection()
            const nativeSelection = window.getSelection()
            const rootElement = editor.getRootElement()

            if (
                nativeSelection !== null &&
                (!$isRangeSelection(selection) ||
                    rootElement === null ||
                    !rootElement.contains(nativeSelection.anchorNode))
            ) {
                setIsText(false)
                return
            }

            if (!$isRangeSelection(selection)) {
                return
            }

            const node = getSelectedNode(selection)

            if (selection.getTextContent() !== '') {
                setIsText($isTextNode(node))
            } else {
                setIsText(false)
            }
        })
    }, [editor])

    useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateToolbar()
        })
    }, [editor, updateToolbar])

    return !isText || !props.position ? null : (
        <Box
            border
            background="level2"
            rounded="sm"
            padding="sm"
            position="absolute"
            style={{
                ...props.position,
                transform: `translateY(calc(-100% - ${vars.space.sm})) translateX(-50%)`,
            }}
        >
            <RichTextToolbar focused onAddLinkClick={props.onAddLinkClick} />
        </Box>
    )
}
