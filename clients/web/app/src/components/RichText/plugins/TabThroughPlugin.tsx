import { $isCodeHighlightNode } from '@lexical/code'
import { $isListItemNode } from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_NORMAL, KEY_TAB_COMMAND } from 'lexical'
import { useLayoutEffect } from 'react'

export const TabThroughPlugin = () => {
    const [editor] = useLexicalComposerContext()
    useLayoutEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                KEY_TAB_COMMAND,
                () => {
                    const selection = $getSelection()
                    if ($isRangeSelection(selection)) {
                        const node = selection.anchor.getNode().getParentOrThrow()
                        if ($isListItemNode(node)) {
                            return false
                        }
                        if ($isCodeHighlightNode(selection.anchor.getNode())) {
                            return false
                        }
                    }
                    return true
                },
                COMMAND_PRIORITY_NORMAL,
            ),
            /* 
           // in case we want to tab-out from lists, feels overkill for now and
           // is achivalbe in a safer way via [ESC]
           editor.registerCommand(
                OUTDENT_CONTENT_COMMAND,
                () => {
                    if (getListLevel() === 1) {
                        editor.blur()
                        return true
                    }
                    return false
                },
                COMMAND_PRIORITY_NORMAL,
            ),
            */
        )
    }, [editor])
    return null
}
