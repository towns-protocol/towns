import { AutoformatBlockRule } from '@udecode/plate-autoformat'
import {
    BaseCodeBlockPlugin,
    BaseCodeLinePlugin,
    insertEmptyCodeBlock,
} from '@udecode/plate-code-block'
import { ParagraphPlugin, PlateEditor } from '@udecode/plate-common/react'
import { SlateEditor, getParentNode, isElement, isType } from '@udecode/plate-common'
import { toggleList, unwrapList } from '@udecode/plate-list'

export const preFormat: AutoformatBlockRule['preFormat'] = (editor) => unwrapList(editor)

export const format = (editor: SlateEditor, customFormatting: () => void) => {
    if (editor.selection) {
        const parentEntry = getParentNode(editor, editor.selection)
        if (!parentEntry) {
            return
        }
        const [node] = parentEntry
        if (
            isElement(node) &&
            !isType(editor, node, BaseCodeBlockPlugin.key) &&
            !isType(editor, node, BaseCodeLinePlugin.key)
        ) {
            customFormatting()
        }
    }
}

export const formatList = (editor: SlateEditor, elementType: string) => {
    format(editor, () =>
        toggleList(editor, {
            type: elementType,
        }),
    )
}

export const formatText = (editor: PlateEditor, text: string) => {
    format(editor, () => editor.insertText(text))
}

export const formatCodeBlock = (editor: SlateEditor) => {
    insertEmptyCodeBlock(editor, {
        defaultType: ParagraphPlugin.key,
        insertNodesOptions: { select: true },
    })
}

export const isParagraph = (editor: SlateEditor) => {
    if (!editor.selection) {
        return false
    }

    const parentEntry = getParentNode(editor, editor.selection)
    if (!parentEntry) {
        return false
    }
    const [node] = parentEntry
    return isType(editor, node, ParagraphPlugin.key)
}
