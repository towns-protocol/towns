import { TPlateEditor, createPlatePlugin } from '@udecode/plate-common/react'
import { type TextDeleteOptions } from 'slate/dist/interfaces/transforms/text'
import { debouncedUnwrapLinkAtSelection } from '../utils/helpers'

const withCustomEditorOverrides = ({ editor }: { editor: TPlateEditor }) => {
    const { delete: plateDelete } = editor

    // Unwrap link node to plain text when deleting a character if remaining text is not a link
    editor.delete = (options: TextDeleteOptions = {}) => {
        plateDelete(options)
        if (options.unit === 'character') {
            debouncedUnwrapLinkAtSelection(editor)
        }
    }

    return editor
}

export const EditorOverridesPlugin = createPlatePlugin({
    key: 'editorOverridesPlugin',
    extendEditor: withCustomEditorOverrides,
})
