import { type PlateEditor, type Value, isEndPoint, isExpanded } from '@udecode/plate-common'
import { getCodeLineEntry } from '@udecode/plate-code-block'

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
