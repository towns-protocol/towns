import { Editor, Point, Range, Element as SlateElement, Transforms } from 'slate'
import { CustomEditor } from '../slate-types'
import { ALL_TAG_TYPES, CustomElement, LIST_ITEM, PARAGRAPH, UL_LIST } from './schema'
import { ONE_ENTER_KEY_BREAK, SLATE_MD_SHORTCUTS } from './MDShortcuts'

export const withMDShortcuts = (editor: CustomEditor) => {
    const { deleteBackward, insertText, insertBreak } = editor

    /**
     * @desc Reset the block type to paragraph when user presses the enter key.
     * @example Breaking out of a `heading` block
     * @see ONE_ENTER_KEY_BREAK
     * @see DOUBLE_ENTER_KEY_BREAK
     */
    editor.insertBreak = () => {
        const { selection } = editor

        if (selection) {
            const [oneEnterBreak] = Editor.nodes<CustomElement>(editor, {
                match: (n) =>
                    !Editor.isEditor(n) &&
                    SlateElement.isElement(n) &&
                    ONE_ENTER_KEY_BREAK.includes(n.type),
            })

            if (oneEnterBreak) {
                Transforms.insertNodes<CustomElement>(editor, [
                    { children: [{ text: '' }], type: PARAGRAPH },
                ])
                return
            }
        }
        insertBreak()
    }

    /**
     * @desc Change the block type based on the first character in the line.
     * @example
     * Typing ## My Title
     * Will insert My Title as a `heading_two` block
     * @see SLATE_MD_SHORTCUTS
     */
    editor.insertText = (text) => {
        const { selection } = editor

        if (text.endsWith(' ') && selection && Range.isCollapsed(selection)) {
            const { anchor } = selection
            const block = Editor.above(editor, {
                match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
            })
            const path = block ? block[1] : []
            const start = Editor.start(editor, path)
            const range = { anchor, focus: start }
            const beforeText = Editor.string(editor, range) + text.slice(0, -1)
            const type = SLATE_MD_SHORTCUTS[beforeText]

            if (type) {
                Transforms.select(editor, range)

                if (!Range.isCollapsed(range)) {
                    Transforms.delete(editor)
                }

                const newProperties: Partial<SlateElement> = {
                    type: type as ALL_TAG_TYPES,
                    depth: beforeText.includes('#')
                        ? (beforeText.match(/#/g) || []).length
                        : undefined,
                }
                Transforms.setNodes<SlateElement>(editor, newProperties, {
                    match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
                })

                if (type === LIST_ITEM) {
                    const list: CustomElement = {
                        type: UL_LIST,
                        children: [],
                        data: { tight: true },
                    }
                    Transforms.wrapNodes(editor, list, {
                        match: (n) =>
                            !Editor.isEditor(n) &&
                            SlateElement.isElement(n) &&
                            n.type === LIST_ITEM,
                    })
                }

                return
            }
        }

        insertText(text)
    }

    /**
     * @desc Opposite of `insertText` defined above. While user is deleting characters, we need to ensure:
     * 1. If it's the start of line, it is changed to `paragraph`
     * 2. If cursor jumps to previous line, which is not a block. the original block type is maintained, and
     *    it is not converted to `paragraph`
     */
    editor.deleteBackward = (...args) => {
        const { selection } = editor

        if (selection && Range.isCollapsed(selection)) {
            const match = Editor.above(editor, {
                match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
            })

            if (match) {
                const [block, path] = match
                const start = Editor.start(editor, path)

                if (
                    !Editor.isEditor(block) &&
                    SlateElement.isElement(block) &&
                    block.type !== PARAGRAPH &&
                    Point.equals(selection.anchor, start)
                ) {
                    const newProperties: Partial<SlateElement> = {
                        type: PARAGRAPH,
                    }
                    Transforms.setNodes(editor, newProperties)

                    if (block.type === LIST_ITEM) {
                        Transforms.unwrapNodes(editor, {
                            match: (n) =>
                                !Editor.isEditor(n) &&
                                SlateElement.isElement(n) &&
                                n.type === UL_LIST,
                            split: true,
                        })
                    }

                    return
                }
            }

            deleteBackward(...args)
        }
    }

    return editor
}
