import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote'
import { getCodeLineEntry } from '@udecode/plate-code-block'
import {
    type PlateEditor,
    type Value,
    findNode,
    isEndPoint,
    isExpanded,
} from '@udecode/plate-common'

/** Is the selection at the end of the last code_line in a code_block */
export const isSelectionAtCodeBlockEnd = <V extends Value>(editor: PlateEditor<V>) => {
    const { selection } = editor

    if (!selection || isExpanded(selection)) {
        return false
    }

    const { codeBlock } = getCodeLineEntry(editor) ?? {}

    if (!codeBlock) {
        return false
    }

    return isEndPoint(editor, selection.anchor, codeBlock[1])
}

export const isSelectionAtBlockQuoteEnd = <V extends Value>(editor: PlateEditor<V>) => {
    const { selection } = editor

    if (!selection || isExpanded(selection)) {
        return false
    }

    const blockQuote = findNode(editor, { at: selection, match: { type: ELEMENT_BLOCKQUOTE } })

    if (!blockQuote) {
        return false
    }

    return isEndPoint(editor, selection.anchor, blockQuote[1])
}
