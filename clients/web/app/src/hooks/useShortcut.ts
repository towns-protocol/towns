import { useHotkeys } from 'react-hotkeys-hook'
import { ShortcutAction, ShortcutActions } from 'data/shortcuts'

type HotkeyOptions = Parameters<typeof useHotkeys>[2]

const defaultOptions: HotkeyOptions = {
    preventDefault: true,
    enableOnContentEditable: true,
}

export const useShortcut = (
    name: ShortcutAction,
    callback: () => void,
    options: Parameters<typeof useHotkeys>[2] = {},
    dependencies?: Parameters<typeof useHotkeys>[3],
) => {
    const shortcut = ShortcutActions[name]
    useHotkeys(shortcut.keys, callback, { ...defaultOptions, ...options }, dependencies)
    return callback
}
