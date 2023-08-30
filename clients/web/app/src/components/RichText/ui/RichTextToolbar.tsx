import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isAtNodeEnd, $setBlocksType } from '@lexical/selection'
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    RangeSelection,
} from 'lexical'
import React, { useCallback, useEffect, useState } from 'react'
import {
    $isListNode,
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $createCodeNode, $isCodeNode } from '@lexical/code'
import { Box, IconButton, MotionStack } from '@ui'

export const RichTextToolbar = (props: { focused: boolean; onAddLinkClick: () => void }) => {
    const { onAddLinkClick, focused } = props

    const [editor] = useLexicalComposerContext()
    const [isItalic, setIsItalic] = useState(false)
    const [isBold, setIsBold] = useState(false)
    const [isStrikethrough, setIsStrikethrough] = useState(false)
    const [isLink, setIsLink] = useState(false)
    const [isCode, setIsCode] = useState(false)
    const [isCodeBlock, setIsCodeBlock] = useState(false)
    const [isBulletList, setIsBulletList] = useState(false)
    const [isNumberedList, setIsNumberedList] = useState(false)

    const updateToolbar = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection()
            const nativeSelection = window.getSelection()
            const rootElement = editor.getRootElement()

            if (
                nativeSelection !== null &&
                (!$isRangeSelection(selection) ||
                    rootElement === null ||
                    !rootElement.contains(nativeSelection.anchorNode))
            ) {
                return
            }

            if (!$isRangeSelection(selection)) {
                return
            }

            const node = getSelectedNode(selection)

            setIsBold(selection.hasFormat('bold'))
            setIsItalic(selection.hasFormat('italic'))
            setIsCode(selection.hasFormat('code'))
            setIsStrikethrough(selection.hasFormat('strikethrough'))

            // Update links
            const parent = node.getParent()

            if ($isLinkNode(parent) || $isLinkNode(node)) {
                setIsLink(true)
            } else {
                setIsLink(false)
            }

            if ($isCodeNode(parent)) {
                setIsCodeBlock(true)
            } else {
                setIsCodeBlock(false)
            }

            const grandParent = parent?.getParent()
            if ($isListNode(grandParent)) {
                setIsBulletList(grandParent.getListType() === 'bullet')
                setIsNumberedList(grandParent.getListType() === 'number')
            } else {
                setIsBulletList(false)
                setIsNumberedList(false)
            }
        })
    }, [editor])

    useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateToolbar()
        })
    }, [editor, updateToolbar])

    const onBoldClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
        editor.focus()
    }
    const onItalicClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
        editor.focus()
    }

    const onNumberedListClick = () => {
        if (isNumberedList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        } else {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        editor.focus()
    }

    const onStrikethroughClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
        editor.focus()
    }

    const onBulletListClick = () => {
        if (isBulletList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        } else {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        editor.focus()
    }

    const onCodeClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
        editor.focus()
    }

    const onCodeBlockClick = () => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                if (isCodeBlock) {
                    $setBlocksType(selection, () => $createParagraphNode())
                } else {
                    $setBlocksType(selection, () => $createCodeNode())
                }
            }
        })
        editor.focus()
    }

    const onLinkClick = () => {
        if (isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
        } else {
            onAddLinkClick()
        }
    }

    return (
        <MotionStack
            horizontal
            layout="preserve-aspect"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            overflowX="scroll"
            gap="xs"
            pointerEvents="auto"
            rounded="sm"
            width="100%"
            opacity={focused ? 'opaque' : '0.4'}
            zIndex="tooltips"
        >
            <IconButton opaque active={isBold} icon="bold" onClick={onBoldClick} />
            <IconButton opaque active={isItalic} icon="italic" onClick={onItalicClick} />

            <IconButton
                opaque
                active={isStrikethrough}
                icon="strikethrough"
                onClick={onStrikethroughClick}
            />
            <IconButton opaque active={isLink} icon="link" onClick={onLinkClick} />
            <Divider />
            <IconButton
                opaque
                active={isNumberedList}
                icon="numberedlist"
                onClick={onNumberedListClick}
            />
            <IconButton
                opaque
                active={isBulletList}
                icon="bulletedlist"
                onClick={onBulletListClick}
            />
            <Divider />
            <IconButton opaque active={isCode} icon="code" onClick={onCodeClick} />
            <IconButton opaque active={isCodeBlock} icon="codeBlock" onClick={onCodeBlockClick} />
        </MotionStack>
    )
}

const Divider = () => (
    <Box paddingX="none">
        <Box borderLeft grow />
    </Box>
)

export const getSelectedNode = (selection: RangeSelection) => {
    const anchor = selection.anchor
    const focus = selection.focus
    const anchorNode = selection.anchor.getNode()
    const focusNode = selection.focus.getNode()
    if (anchorNode === focusNode) {
        return anchorNode
    }
    const isBackward = selection.isBackward()
    if (isBackward) {
        return $isAtNodeEnd(focus) ? anchorNode : focusNode
    } else {
        return $isAtNodeEnd(anchor) ? focusNode : anchorNode
    }
}
