import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_LOW,
    INDENT_CONTENT_COMMAND,
    KEY_TAB_COMMAND,
    OUTDENT_CONTENT_COMMAND,
} from 'lexical'
import { useEffect } from 'react'

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

                event.preventDefault()

                return editor.dispatchCommand(
                    event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
                    undefined,
                )
            },
            COMMAND_PRIORITY_LOW,
        )
    })

    return null
}
