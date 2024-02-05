import { Editor, Element as SlateElement, Node as SlateNode } from 'slate'
import { ReactEditor } from 'slate-react'
import { CustomEditor } from '../slate-types'
import { SLATE_MD_SHORTCUTS } from './MDShortcuts'

/**
 * @desc This function aims to improve editor's performance on Android as outlined here:
 * https://github.com/ianstormtaylor/slate/pull/4988
 *
 * It's taken from the official MD example available on Slate's documentation:
 * [Markdown editor](https://github.com/ianstormtaylor/slate/blob/main/site/examples/markdown-shortcuts.tsx):
 **/
export const handleDOMBeforeInput = (editor: CustomEditor) => (e: InputEvent) => {
    queueMicrotask(() => {
        const pendingDiffs = ReactEditor.androidPendingDiffs(editor)

        const scheduleFlush = pendingDiffs?.some(({ diff, path }) => {
            if (!diff.text.endsWith(' ')) {
                return false
            }

            const { text } = SlateNode.leaf(editor, path)
            const beforeText = text.slice(0, diff.start) + diff.text.slice(0, -1)
            if (!(beforeText in SLATE_MD_SHORTCUTS)) {
                return
            }

            const blockEntry = Editor.above(editor, {
                at: path,
                match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
            })
            if (!blockEntry) {
                return false
            }

            const [, blockPath] = blockEntry
            return Editor.isStart(editor, Editor.start(editor, path), blockPath)
        })

        if (scheduleFlush) {
            ReactEditor.androidScheduleFlush(editor)
        }
    })
}
