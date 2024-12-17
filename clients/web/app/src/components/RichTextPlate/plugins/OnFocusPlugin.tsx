import { useEffect } from 'react'
import { PlateEditor, usePlateSelectors } from '@udecode/plate-common/react'
import { focusEditorTowns, isInputFocused } from '../utils/helpers'

type Props = {
    autoFocus?: boolean
    onFocusChange: (focus: boolean) => void
    editor: PlateEditor
}

export const OnFocusPlugin = ({ autoFocus, onFocusChange, editor }: Props) => {
    const isRendered = usePlateSelectors().isMounted()

    useEffect(() => {
        if (!autoFocus) {
            return
        }

        if (isRendered && editor) {
            const timeout = setTimeout(() => {
                if (isInputFocused()) {
                    return
                }
                focusEditorTowns(editor, true)
                onFocusChange(true)
            }, 0)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isRendered, autoFocus, onFocusChange, editor])

    return null
}
