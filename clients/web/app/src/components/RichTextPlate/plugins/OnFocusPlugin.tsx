import { RefObject, useEffect } from 'react'
import { PlateEditor, usePlateSelectors } from '@udecode/plate-common/react'
import { focusEditorTowns, isInputFocused } from '../utils/helpers'

type Props = {
    autoFocus?: boolean
    onFocusChange: (focus: boolean) => void
    editorRef: RefObject<PlateEditor>
}

export const OnFocusPlugin = ({ autoFocus, onFocusChange, editorRef }: Props) => {
    const isRendered = usePlateSelectors().isMounted()

    useEffect(() => {
        if (!autoFocus) {
            return
        }

        const editor = editorRef.current

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
    }, [isRendered, autoFocus, onFocusChange, editorRef])

    return null
}
