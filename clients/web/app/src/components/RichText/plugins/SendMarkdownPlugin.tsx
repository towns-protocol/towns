import { $convertToMarkdownString } from '@lexical/markdown'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
    $getRoot,
    $isParagraphNode,
    CLEAR_EDITOR_COMMAND,
    COMMAND_PRIORITY_LOW,
    INSERT_PARAGRAPH_COMMAND,
    KEY_ENTER_COMMAND,
} from 'lexical'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Mention } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { Button, Icon, MotionBox, Stack } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { useDevice } from 'hooks/useDevice'

import { $isMentionNode } from '../nodes/MentionNode'

export const SendMarkdownPlugin = (props: {
    disabled?: boolean
    displayButtons: 'always' | 'on-focus'
    focused: boolean
    isEditing: boolean
    hasImage: boolean
    onSend?: (value: string, mentions: Mention[]) => Promise<void>
    onSendAttemptWhileDisabled?: () => void
    onCancel?: () => void
    isEditorEmpty: boolean
    setIsEditorEmpty: (isEditorEmpty: boolean) => void
}) => {
    const {
        disabled,
        onSend,
        onSendAttemptWhileDisabled,
        isEditorEmpty,
        setIsEditorEmpty,
        hasImage,
    } = props
    const [editor] = useLexicalComposerContext()

    const { parseMarkdown } = useParseMarkdown(onSend)
    const { isTouch } = useDevice()

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
        editor.setEditable(!disabled)
    }, [disabled, editor])

    const editorEmptyRef = useRef(isEditorEmpty)
    editorEmptyRef.current = isEditorEmpty

    useEffect(() => {
        return editor.registerUpdateListener(({ dirtyElements, prevEditorState, tags }) => {
            editor.getEditorState().read(() => {
                const root = $getRoot()
                const children = root.getChildren()

                if (children.length > 1) {
                    if (editorEmptyRef.current) {
                        setIsEditorEmpty(false)
                    }
                } else {
                    if ($isParagraphNode(children[0])) {
                        const paragraphChildren = children[0].getChildren()
                        const value = paragraphChildren.length === 0
                        if (value !== editorEmptyRef.current) {
                            setIsEditorEmpty(value)
                        }
                    } else {
                        if (editorEmptyRef.current) {
                            setIsEditorEmpty(false)
                        }
                    }
                }
            })
        })
    }, [editor, setIsEditorEmpty])

    useEffect(() => {
        // keep depency in order to register when updated
        if (isTouch) {
            return
        }
        registerCommandCount
        return mergeRegister(
            editor.registerCommand(
                KEY_ENTER_COMMAND,
                (e: KeyboardEvent, editor) => {
                    if (!e.shiftKey) {
                        if (!disabled) {
                            parseMarkdown().then(() => {
                                editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
                            })
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
    }, [editor, parseMarkdown, disabled, registerCommandCount, onSendAttemptWhileDisabled, isTouch])

    const sendMessage = useCallback(async () => {
        parseMarkdown().then(() => {
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
        })
    }, [editor, parseMarkdown])

    const shouldDisplayButtons =
        props.displayButtons === 'always' ||
        (props.displayButtons === 'on-focus' && (props.focused || !isEditorEmpty)) ||
        hasImage

    return (
        <AnimatePresence>
            {shouldDisplayButtons && (
                <MotionBox
                    initial={isTouch ? { height: 0, opacity: 0 } : undefined}
                    exit={isTouch ? { height: 0, opacity: 0 } : undefined}
                    animate={isTouch ? { height: 'auto', opacity: 1 } : undefined}
                    layout="position"
                >
                    <EditMessageButtons
                        isEditing={props.isEditing}
                        isEditorEmpty={isEditorEmpty}
                        hasImage={hasImage}
                        disabled={disabled}
                        onCancel={props.onCancel}
                        onSave={sendMessage}
                    />
                </MotionBox>
            )}
        </AnimatePresence>
    )
}

const EditMessageButtons = (props: {
    onSave?: () => void
    onCancel?: () => void
    isEditing: boolean
    isEditorEmpty: boolean
    hasImage: boolean
    disabled?: boolean
}) => {
    const { isTouch } = useDevice()
    const { onCancel, onSave, isEditing, isEditorEmpty, hasImage } = props

    useEffect(() => {
        if (!onCancel) {
            return
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onCancel?.()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
        }
    }, [onCancel])

    const cancelButtonPressed = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            onCancel?.()
        },
        [onCancel],
    )

    const saveButtonPressed = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            onSave?.()
        },
        [onSave],
    )

    const disabled = props.disabled || (isEditorEmpty && !hasImage)

    return (
        <Stack horizontal gap paddingX={isTouch ? 'none' : 'xs'}>
            {isEditing ? (
                <>
                    <Button size="button_xs" onClick={cancelButtonPressed}>
                        Cancel
                    </Button>
                    <Button size="button_xs" tone="cta1" onClick={saveButtonPressed}>
                        Save
                    </Button>
                </>
            ) : isTouch ? (
                <Icon
                    type={disabled ? 'touchSendDisabled' : 'touchSendEnabled'}
                    size="square_lg"
                    onClick={disabled ? props.onCancel : props.onSave}
                />
            ) : (
                <Icon
                    type={disabled ? 'touchSendDisabled' : 'touchSendEnabled'}
                    size="square_md"
                    onClick={disabled ? undefined : props.onSave}
                />
            )}
        </Stack>
    )
}

const useParseMarkdown = (onSend?: (value: string, mentions: Mention[]) => Promise<void>) => {
    const [editor] = useLexicalComposerContext()
    const parseMarkdown = useCallback(async () => {
        if (onSend) {
            await editor.getEditorState().read(async () => {
                const mentions = $getRoot()
                    .getAllTextNodes()
                    .filter($isMentionNode)
                    .map((node) => {
                        const { userId, displayName } = node.getMention()
                        if (!userId) {
                            console.error('Mention is missing userId')
                            return undefined
                        }
                        return {
                            userId,
                            displayName,
                        } satisfies Mention
                    })
                    .filter(notUndefined)
                const markdown = $convertToMarkdownString()
                await onSend(markdown, mentions)
            })
        } else {
            console.error('No onSend callback provided to SendMarkdownPlugin')
        }
    }, [editor, onSend])
    return { parseMarkdown }
}
