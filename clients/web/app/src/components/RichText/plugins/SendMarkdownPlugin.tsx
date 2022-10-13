import { $convertToMarkdownString } from '@lexical/markdown'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
    CLEAR_EDITOR_COMMAND,
    COMMAND_PRIORITY_LOW,
    INSERT_PARAGRAPH_COMMAND,
    KEY_ENTER_COMMAND,
} from 'lexical'
import React, { useCallback, useEffect } from 'react'
import { Button, Stack } from '@ui'

export const SendMarkdownPlugin = (props: {
    displayButtons?: boolean
    onSend?: (value: string) => void
    onCancel?: () => void
}) => {
    const { onSend } = props
    const [editor] = useLexicalComposerContext()

    const { parseMarkdown } = useParseMarkdown(onSend)

    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (e: KeyboardEvent, editor) => {
                    if (!e.shiftKey) {
                        parseMarkdown()
                        editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
                        e.preventDefault()
                        e.stopImmediatePropagation()
                    } else {
                        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined)
                        e.preventDefault()
                        e.stopImmediatePropagation()
                    }

                    return true
                },
                COMMAND_PRIORITY_LOW,
            ),
        )
    }, [editor, onSend, parseMarkdown])

    const sendMessage = useCallback(() => {
        parseMarkdown()
        editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
    }, [editor, parseMarkdown])

    return props.displayButtons ? (
        <EditMessageButtons onCancel={props.onCancel} onSave={sendMessage} />
    ) : null
}

const EditMessageButtons = (props: { onSave?: () => void; onCancel?: () => void }) => {
    return (
        <Stack horizontal gap>
            <Button size="button_sm" tone="cta1" onClick={props.onSave}>
                Save
            </Button>
            <Button size="button_sm" onClick={props.onCancel}>
                Cancel
            </Button>
        </Stack>
    )
}

const useParseMarkdown = (onSend?: (value: string) => void) => {
    const [editor] = useLexicalComposerContext()
    const parseMarkdown = useCallback(() => {
        if (onSend) {
            editor.getEditorState().read(() => {
                const markdown = $convertToMarkdownString()
                onSend(markdown)
            })
        }
    }, [editor, onSend])
    return { parseMarkdown }
}
