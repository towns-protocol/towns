import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'
import { useInputStore } from 'store/store'

type Props = {
    storageId?: string
}

export const RememberInputPlugin = (props: Props) => {
    const { storageId } = props
    const setInput = useInputStore((state) => state.setChannelmessageInput)

    const [editor] = useLexicalComposerContext()
    useEffect(() => {
        if (!storageId) {
            return
        }
        let timeout: NodeJS.Timeout

        const removeTextContentListener = editor.registerTextContentListener((textContent) => {
            if (timeout) {
                // deferring
                clearTimeout(timeout)
            }
            // we can be very lazy with this
            timeout = setTimeout(() => {
                setInput(storageId, textContent)
            }, 500)
        })

        return () => {
            removeTextContentListener()
        }
    }, [editor, setInput, storageId])

    return null
}
