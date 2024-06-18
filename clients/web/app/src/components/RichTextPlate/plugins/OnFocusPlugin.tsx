import { RefObject, useEffect } from 'react'
import { usePlateSelectors } from '@udecode/plate-core'
import { focusEditor } from '@udecode/slate-react'
import { getEndPoint } from '@udecode/slate'
import { PlateEditor } from '@udecode/plate-common'

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
                if (document.activeElement?.tagName === 'INPUT') {
                    return
                }
                focusEditor(editor, getEndPoint(editor, []))
                onFocusChange(true)
            }, 0)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isRendered, autoFocus, onFocusChange, editorRef])

    return null
}
