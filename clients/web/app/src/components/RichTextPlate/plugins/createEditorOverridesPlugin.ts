import { PlateEditor, Value, createPluginFactory } from '@udecode/plate-common'
import { insertBreakList } from '@udecode/plate-list'
import { TextDeleteOptions } from 'slate/dist/interfaces/transforms/text'
import { debouncedUnwrapLinkAtSelection } from '../utils/helpers'

const withCustomEditorOverrides = (editor: PlateEditor<Value>) => {
    const { insertSoftBreak, delete: plateDelete } = editor

    // Pressing shift + enter will in list block create a new list item
    editor.insertSoftBreak = () => {
        if (insertBreakList(editor)) {
            return
        }

        insertSoftBreak()
    }

    // Unwrap link node to plain text when deleting a character if remaining text is not a link
    editor.delete = (options: TextDeleteOptions = {}) => {
        plateDelete(options)
        if (options.unit === 'character') {
            debouncedUnwrapLinkAtSelection(editor)
        }
    }

    return editor
}

export const createEditorOverridesPlugin = createPluginFactory({
    key: 'editorOverridesPlugin',
    withOverrides: withCustomEditorOverrides,
})
