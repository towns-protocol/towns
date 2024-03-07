import { AutoformatBlockRule } from '@udecode/plate-autoformat'
import {
    ELEMENT_CODE_BLOCK,
    ELEMENT_CODE_LINE,
    insertEmptyCodeBlock,
} from '@udecode/plate-code-block'
import {
    ELEMENT_DEFAULT,
    PlateEditor,
    getParentNode,
    isElement,
    isType,
} from '@udecode/plate-common'
import { toggleList, unwrapList } from '@udecode/plate-list'

export const preFormat: AutoformatBlockRule['preFormat'] = (editor) => unwrapList(editor)

export const format = (editor: PlateEditor, customFormatting: () => void) => {
    if (editor.selection) {
        const parentEntry = getParentNode(editor, editor.selection)
        if (!parentEntry) {
            return
        }
        const [node] = parentEntry
        if (
            isElement(node) &&
            !isType(editor, node, ELEMENT_CODE_BLOCK) &&
            !isType(editor, node, ELEMENT_CODE_LINE)
        ) {
            customFormatting()
        }
    }
}

export const formatList = (editor: PlateEditor, elementType: string) => {
    format(editor, () =>
        toggleList(editor, {
            type: elementType,
        }),
    )
}

export const formatText = (editor: PlateEditor, text: string) => {
    format(editor, () => editor.insertText(text))
}

export const formatCodeBlock = (editor: PlateEditor) => {
    insertEmptyCodeBlock(editor, {
        defaultType: ELEMENT_DEFAULT,
        insertNodesOptions: { select: true },
    })
}
