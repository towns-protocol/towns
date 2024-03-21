import { useEffect } from 'react'
import { useEditorRef, useEditorSelector } from '@udecode/plate-core'
import { useInputStore } from 'store/store'
import { SECOND_MS } from 'data/constants'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { toPlainText } from '../utils/toPlainText'
import { toMD } from '../utils/toMD'

type Props = {
    storageId?: string
}

export const RememberInputPlugin = (props: Props) => {
    const { storageId } = props
    const setInput = useInputStore((state) => state.setChannelmessageInput)

    const editor = useEditorRef()
    const children = useThrottledValue(
        useEditorSelector((_editor) => toPlainText(_editor.children), []),
        SECOND_MS,
    )

    useEffect(() => {
        if (!storageId) {
            return
        }
        toMD(editor).then((markdownMessage) => {
            setInput(storageId, markdownMessage.message)
        })
    }, [children, editor, setInput, storageId])

    return null
}
