import { PlateEditor, THistoryEditor, Value, createPluginFactory } from '@udecode/plate-common'
import cloneDeep from 'lodash/cloneDeep'
import { datadogRum } from '@datadog/browser-rum'

// Add a try-catch block to all editor functions
const tryCatchCallback =
    <E extends PlateEditor>(editorFunc: E[keyof E], editor: E) =>
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

const withErrorHandler = <V extends Value = Value, E extends PlateEditor<V> = PlateEditor<V>>(
    editor: E,
) => {
    for (const key in editor) {
        if (typeof editor[key] === 'function') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            editor[key] = tryCatchCallback(editor[key], editor)
        }
    }
    return editor
}

export const createErrorHandlingPlugin = createPluginFactory({
    key: 'PLATE_ERROR_HANDLER',
    withOverrides: withErrorHandler,
})

/** We replace text in user input with underscore before logging it to Datadog
 *  for privacy */
const replaceUserInput = (
    undo: THistoryEditor['history']['undos'],
): THistoryEditor['history']['undos'] => {
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
