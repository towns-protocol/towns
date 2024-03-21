import {
    HotkeyPlugin,
    KeyboardHandlerReturnType,
    PlateEditor,
    Value,
    createPluginFactory,
    isHotkey,
} from '@udecode/plate-common'
import { comboboxActions, comboboxSelectors } from '@udecode/plate-combobox'
import { findMentionInput, removeMentionInput } from '@udecode/plate-mention'

const KEY_EXIT_COMBOBOX = 'exit_combobox'

/**
 * When user presses space or enter, and there are no results available,
 * it will reset the combobox and remove the mention input, turning it back to a
 * default paragraph node. This will allow users to type and send things like
 * `:)` or `@ me`
 */
export const createExitComboboxPlugin = createPluginFactory<HotkeyPlugin>({
    key: KEY_EXIT_COMBOBOX,
    handlers: {
        onKeyDown:
            <V extends Value = Value, E extends PlateEditor<V> = PlateEditor<V>>(
                editor: E,
            ): KeyboardHandlerReturnType =>
            (event) => {
                const isOpen = comboboxSelectors.isOpen()

                if (!isOpen) {
                    return
                }
                const { filteredItems } = comboboxSelectors.state()
                if (
                    filteredItems.length === 0 &&
                    (isHotkey('space', event) || isHotkey('Enter', event))
                ) {
                    comboboxActions.reset()
                    const currentMentionInput = findMentionInput(editor)!
                    if (currentMentionInput) {
                        removeMentionInput(editor, currentMentionInput[1])
                    }
                }
            },
    },
})
