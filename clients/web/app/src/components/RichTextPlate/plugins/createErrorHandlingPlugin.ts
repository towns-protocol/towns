import { TEditor } from '@udecode/plate-common'
import { TPlateEditor, createPlatePlugin } from '@udecode/plate-common/react'
import cloneDeep from 'lodash/cloneDeep'
import { datadogRum } from '@datadog/browser-rum'

// Add a try-catch block to all editor functions
const tryCatchCallback =
    <E extends TPlateEditor>(editorFunc: E[keyof E], editor: E) =>
    (...editorFuncArgs: unknown[]) => {
        try {
            if (typeof editorFunc === 'function') {
                return editorFunc(...editorFuncArgs)
            }
        } catch (error) {
            datadogRum.addError(error, { undo: replaceUserInput(editor.history.undos) })
            throw error
        }
    }

const withErrorHandler = ({ editor }: { editor: TPlateEditor }) => {
    for (const key in editor) {
        if (typeof editor[key] === 'function') {
            editor[key] = tryCatchCallback(editor[key], editor)
        }
    }
    return editor
}

export const ErrorHandlingPlugin = createPlatePlugin({
    key: 'PLATE_ERROR_HANDLER',
    extendEditor: withErrorHandler,
})

/** We replace text in user input with underscore before logging it to Datadog
 *  for privacy */
const replaceUserInput = (undo: TEditor['history']['undos']): TEditor['history']['undos'] => {
    return cloneDeep(undo).map((op) => ({
        ...op,
        operations: op.operations.map((operation) => {
            if (operation.type === 'insert_text') {
                return {
                    ...operation,
                    text: operation.text?.replace(/[a-zA-Z0-9]/g, '_'),
                }
            }
            return operation
        }),
    }))
}
