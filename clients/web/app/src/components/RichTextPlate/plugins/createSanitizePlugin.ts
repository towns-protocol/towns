import {
    HotkeyPlugin,
    KeyboardHandlerReturnType,
    PlateEditor,
    Value,
    createPluginFactory,
} from '@udecode/plate-common'
import { toDOMNode } from '@udecode/slate-react'

const KEY_SANITIZE = 'sanitize_plugin'

/**
 * Sometimes the editor content can become empty, due to how Safari on iOS
 * handles backspace. This plugin is a safety backup, which will reset the
 * editor in such cases, preventing a total crash
 */
export const createSanitizeDOMPlugin = createPluginFactory<HotkeyPlugin>({
    key: KEY_SANITIZE,
    handlers: {
        onKeyDown:
            (editor: PlateEditor<Value>): KeyboardHandlerReturnType =>
            (event) => {
                if (event.key !== 'Backspace') {
                    return
                }

                const children = toDOMNode(editor, editor)?.children
                if (!children || children.length === 0 || children?.item(0)?.textContent === '') {
                    event.preventDefault()
                    event.stopPropagation()
                    return false
                }
            },
    },
})
