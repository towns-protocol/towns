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
import { $createQuoteNode, $isQuoteNode } from '@lexical/rich-text'
import { Box, IconButton, Stack } from '@ui'

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
    const [isBlockQuote, setIsBlockQuote] = useState(false)

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

            setIsBlockQuote($isQuoteNode(parent))

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

    const onToolbarPointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
    }

    const onBoldClick = (e: React.MouseEvent) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
    }
    const onItalicClick = (e: React.MouseEvent) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
    }

    const onNumberedListClick = (e: React.MouseEvent) => {
        if (isNumberedList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        } else {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
    }

    const onStrikethroughClick = (e: React.MouseEvent) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
    }

    const onBulletListClick = (e: React.MouseEvent) => {
        if (isBulletList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        } else {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
    }

    const onCodeClick = (e: React.MouseEvent) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
    }

    const onCodeBlockClick = (e: React.MouseEvent) => {
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
    }
    const onBlockQuoteClick = (e: React.MouseEvent) => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                if (isBlockQuote) {
                    $setBlocksType(selection, () => $createParagraphNode())
                } else {
                    $setBlocksType(selection, () => $createQuoteNode())
                }
            }
        })
    }

    const onLinkClick = (e: React.MouseEvent) => {
        if (isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
        } else {
            onAddLinkClick()
        }
    }

    return (
        <Stack
            horizontal
            overflowX="scroll"
            gap="xs"
            pointerEvents="auto"
            width="100%"
            opacity={focused ? 'opaque' : '0.4'}
            zIndex="tooltips"
            onPointerDown={onToolbarPointerDown}
        >
            <IconButton
                opaque
                active={isBold}
                icon="bold"
                tooltip="Bold"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                onClick={onBoldClick}
            />
            <IconButton
                opaque
                active={isItalic}
                icon="italic"
                tooltip="Italic"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                onClick={onItalicClick}
            />

            <IconButton
                opaque
                active={isStrikethrough}
                icon="strikethrough"
                tooltip="Strikethrough"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                onClick={onStrikethroughClick}
            />
            <IconButton
                opaque
                active={isLink}
                icon="link"
                tooltip="Link"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                onClick={onLinkClick}
            />
            <Divider />
            <IconButton
                opaque
                active={isNumberedList}
                icon="numberedlist"
                tooltip="Ordered list"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                onClick={onNumberedListClick}
            />
            <IconButton
                opaque
                active={isBulletList}
                icon="bulletedlist"
                tooltip="Bulleted list"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                onClick={onBulletListClick}
            />
            <Divider />
            <IconButton
                opaque
                tooltip="Block quote"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                active={isBlockQuote}
                icon="blockquote"
                onClick={onBlockQuoteClick}
            />
            <Divider />
            <IconButton
                opaque
                active={isCode}
                tooltip="Code"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                icon="code"
                onClick={onCodeClick}
            />
            <IconButton
                opaque
                active={isCodeBlock}
                icon="codeBlock"
                tooltip="Code block"
                tooltipOptions={{ placement: 'vertical', immediate: true }}
                onClick={onCodeBlockClick}
            />
        </Stack>
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
