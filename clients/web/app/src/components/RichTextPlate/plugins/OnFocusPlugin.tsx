import { useEffect } from 'react'
import { usePlateSelectors } from '@udecode/plate-core'
import { focusEditor } from '@udecode/slate-react'
import { getStartPoint } from '@udecode/slate'

type Props = {
    autoFocus?: boolean
    onFocusChange: (focus: boolean) => void
}

export const OnFocusPlugin = ({ autoFocus, onFocusChange }: Props) => {
    const editor = usePlateSelectors().editor()
    const isRendered = usePlateSelectors().isMounted()

    useEffect(() => {
        if (!autoFocus) {
            return
        }

        if (isRendered && editor) {
            setTimeout(() => {
                focusEditor(editor, getStartPoint(editor, [0]))
                onFocusChange(true)
            }, 0)
        }
    }, [editor, isRendered, autoFocus, onFocusChange])

    return null
}
