import { $convertToMarkdownString } from '@lexical/markdown'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
    $getRoot,
    CLEAR_EDITOR_COMMAND,
    COMMAND_PRIORITY_LOW,
    INSERT_PARAGRAPH_COMMAND,
    KEY_ENTER_COMMAND,
} from 'lexical'
import React, { useCallback, useEffect, useState } from 'react'
import { Mention } from 'use-zion-client'
import { Button, Stack } from '@ui'
import { $isMentionNode } from '../nodes/MentionNode'

export const SendMarkdownPlugin = (props: {
    disabled?: boolean
    displayButtons?: boolean
    onSend?: (value: string, mentions: Mention[]) => void
    onSendAttemptWhileDisabled?: () => void
    onCancel?: () => void
}) => {
    const { disabled, onSend, onSendAttemptWhileDisabled } = props
    const [editor] = useLexicalComposerContext()

    const { parseMarkdown } = useParseMarkdown(onSend)

    // the following is hack makes the command fire last in the queue of
    // LOW_PRIORITY_COMMANDS allowing commands on the same priority to fire
    // first. Specifically, for the typeahead plugin requiring ENTER to make a selection.
    const [registerCommandCount, setRegisterCommandCount] = useState(0)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                setRegisterCommandCount((b) => b + 1)
            }
        }
        window.addEventListener('keydown', onKey, { capture: true })
        return () => {
            window.removeEventListener('keydown', onKey, { capture: true })
        }
    }, [])

    useEffect(() => {
        // keep depency in order to register when updated
        registerCommandCount
        return mergeRegister(
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (e: KeyboardEvent, editor) => {
                    if (!e.shiftKey) {
                        if (!disabled) {
                            parseMarkdown()
                            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
                        } else if (onSendAttemptWhileDisabled) {
                            onSendAttemptWhileDisabled()
                        }
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
    }, [editor, parseMarkdown, disabled, registerCommandCount, onSendAttemptWhileDisabled])

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
            <Button size="button_sm" tone="cta1" animate={false} onClick={props.onSave}>
                Save
            </Button>
            <Button size="button_sm" animate={false} onClick={props.onCancel}>
                Cancel
            </Button>
        </Stack>
    )
}

const useParseMarkdown = (onSend?: (value: string, mentions: Mention[]) => void) => {
    const [editor] = useLexicalComposerContext()
    const parseMarkdown = useCallback(() => {
        if (onSend) {
            editor.getEditorState().read(() => {
                const mentions = $getRoot()
                    .getAllTextNodes()
                    .filter($isMentionNode)
                    .map((node) => {
                        const mention = node.getMention()
                        if (!mention.userId) {
                            console.error('Mention is missing userId')
                        }
                        return mention
                    })
                const markdown = $convertToMarkdownString()
                onSend(markdown, mentions)
            })
        } else {
            console.error('No onSend callback provided to SendMarkdownPlugin')
        }
    }, [editor, onSend])
    return { parseMarkdown }
}
