import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_CRITICAL,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND,
} from 'lexical'
import React, { useCallback, useEffect, useState } from 'react'
import { IconButton, Stack } from '@ui'

export const Toolbar = () => {
    const [editor] = useLexicalComposerContext()
    const [isItalic, setIsItalic] = useState(false)
    const [isBold, setIsBold] = useState(false)
    const [isStrikethrough, setIsStrikethrough] = useState(false)

    const updateToolbar = useCallback(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat('bold'))
            setIsItalic(selection.hasFormat('italic'))
            setIsStrikethrough(selection.hasFormat('strikethrough'))
        }
    }, [])

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (_payload, newEditor) => {
                updateToolbar()
                return false
            },
            COMMAND_PRIORITY_CRITICAL,
        )
    }, [editor, updateToolbar])

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateToolbar()
                })
            }),
        )
    }, [editor, updateToolbar])

    const onBoldClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
    }

    const onItalicClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
    }

    const onStrikeClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
    }
    return (
        <Stack horizontal gap="xs" color="gray2">
            <IconButton icon="bold" active={isBold} onClick={onBoldClick} />
            <IconButton icon="italic" active={isItalic} onClick={onItalicClick} />
            <IconButton icon="strikethrough" active={isStrikethrough} onClick={onStrikeClick} />
        </Stack>
    )
}
