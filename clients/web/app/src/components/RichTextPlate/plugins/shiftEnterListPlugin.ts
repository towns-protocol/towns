import { PlateEditor, Value, createPluginFactory } from '@udecode/plate-common'
import { insertBreakList } from '@udecode/plate-list'

const withShiftEnterList = (editor: PlateEditor<Value>) => {
    const { insertSoftBreak } = editor

    editor.insertSoftBreak = () => {
        if (insertBreakList(editor)) {
            return
        }

        insertSoftBreak()
    }

    return editor
}

export const createShiftEnterListPlugin = createPluginFactory({
    key: 'shiftEnterList',
    withOverrides: withShiftEnterList,
})
