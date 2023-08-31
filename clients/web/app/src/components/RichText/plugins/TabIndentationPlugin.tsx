import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_EDITOR,
    INDENT_CONTENT_COMMAND,
    KEY_TAB_COMMAND,
    OUTDENT_CONTENT_COMMAND,
} from 'lexical'
import { useEffect } from 'react'
import { $isListItemNode } from '@lexical/list'
import { getSelectedNode } from '../ui/RichTextToolbar'

/**
 * This plugin adds the ability to indent content using the tab key. Generally, we don't
 * recommend using this plugin as it could negatively affect acessibility for keyboard
 * users, causing focus to become trapped within the editor.
 */
export function TabIndentationPlugin(): null {
    const [editor] = useLexicalComposerContext()

    useEffect(() => {
        return editor.registerCommand<KeyboardEvent>(
            KEY_TAB_COMMAND,
            (event) => {
                const selection = $getSelection()

                if (!$isRangeSelection(selection)) {
                    return false
                }

                // Don't indent if the selection is not in a list
                const node = getSelectedNode(selection)
                const parent = node.getParent()
                const grandParent = parent?.getParent()

                if (
                    !(
                        $isListItemNode(node) ||
                        $isListItemNode(parent) ||
                        $isListItemNode(grandParent)
                    )
                ) {
                    return false
                }
                event.preventDefault()

                return editor.dispatchCommand(
                    event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
                    undefined,
                )
            },
            COMMAND_PRIORITY_EDITOR,
        )
    })

    return null
}
