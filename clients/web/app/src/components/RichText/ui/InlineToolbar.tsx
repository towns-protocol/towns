import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isAtNodeEnd, $setBlocksType } from '@lexical/selection'
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    FORMAT_TEXT_COMMAND,
    RangeSelection,
} from 'lexical'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $createCodeNode, $isCodeNode } from '@lexical/code'
import { Box, IconButton, Stack } from '@ui'
import { vars } from 'ui/styles/vars.css'

export const InlineToolbar = (props: {
    onAddLinkClick: () => void
    onClose: () => void
    position:
        | undefined
        | {
              top: number
              left: number | string
          }
}) => {
    const [editor] = useLexicalComposerContext()
    const [isText, setIsText] = useState(false)
    const [isItalic, setIsItalic] = useState(false)
    const [isBold, setIsBold] = useState(false)
    const [isLink, setIsLink] = useState(false)
    const [isCode, setIsCode] = useState(false)
    const [isCodeBlock, setIsCodeBlock] = useState(false)

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
                setIsText(false)
                return
            }

            if (!$isRangeSelection(selection)) {
                return
            }

            const node = getSelectedNode(selection)

            setIsBold(selection.hasFormat('bold'))
            setIsItalic(selection.hasFormat('italic'))
            setIsCode(selection.hasFormat('code'))

            // Update links
            const parent = node.getParent()

            if ($isLinkNode(parent) || $isLinkNode(node)) {
                setIsLink(true)
            } else {
                setIsLink(false)
            }

            if (selection.getTextContent() !== '') {
                setIsText($isTextNode(node))
            } else {
                setIsText(false)
            }

            if ($isCodeNode(parent)) {
                setIsCodeBlock(true)
            } else {
                setIsCodeBlock(false)
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
    }
    const onItalicClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
    }

    const onOrderedListClick = () => {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    }

    const onBulletListClick = () => {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    }

    const onCodeClick = () => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
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
    }

    const onLinkClick = () => {
        if (isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
        } else {
            props.onAddLinkClick()
        }
    }

    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (e.target && tooltipRef.current) {
                const isWithinBounds = tooltipRef.current.contains(e.target as HTMLElement)
                if (!isWithinBounds) {
                    props.onClose()
                }
            }
        }
        window.addEventListener('mousedown', onClick)
        return () => {
            window.removeEventListener('mousedown', onClick)
        }
    }, [props])

    return !isText || !props.position ? null : (
        <Stack
            horizontal
            border
            gap="sm"
            pointerEvents="auto"
            position="absolute"
            style={{
                ...props.position,
                transform: `translateY(calc(-100% - ${vars.space.sm})) translateX(-50%)`,
            }}
            background="level2"
            rounded="sm"
            padding="sm"
            width="auto"
            color="gray2"
            ref={tooltipRef}
            justifyContent="center"
            zIndex="tooltips"
        >
            <IconButton opaque active={isItalic} icon="italic" onMouseDown={onItalicClick} />
            <IconButton opaque active={isBold} icon="bold" onClick={onBoldClick} />
            <IconButton opaque active={isLink} icon="link" onClick={onLinkClick} />
            <Divider />
            <IconButton opaque active={isLink} icon="numberedlist" onClick={onOrderedListClick} />
            <IconButton opaque active={isLink} icon="bulletedlist" onClick={onBulletListClick} />
            <Divider />
            <IconButton opaque active={isCode} icon="code" onClick={onCodeClick} />
            <IconButton opaque active={isCodeBlock} icon="codeBlock" onClick={onCodeBlockClick} />
        </Stack>
    )
}

const Divider = () => (
    <Box paddingX="none">
        <Box borderLeft grow />
    </Box>
)

const getSelectedNode = (selection: RangeSelection) => {
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
