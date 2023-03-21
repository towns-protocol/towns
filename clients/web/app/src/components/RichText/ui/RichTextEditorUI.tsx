import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_LOW,
    SELECTION_CHANGE_COMMAND,
} from 'lexical'
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { BaseEmoji, EmojiData } from 'emoji-mart'
import { createPortal } from 'react-dom'
import { Box, BoxProps, RootLayerContext, Stack } from '@ui'
import { GiphyEntry } from '@components/Giphy/GiphyEntry'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { $createEmojiNode } from '../nodes/EmojiNode'
import { InlineToolbar } from './InlineToolbar'
import { AddLinkModal } from './LinkModal'

export const RichTextUI = (props: {
    children: React.ReactNode
    editing?: boolean
    focused: boolean
    readOnly?: boolean
    background?: BoxProps['background']
    threadId?: string
}) => {
    const { background = 'level2' } = props
    const [editor] = useLexicalComposerContext()

    const onSelectEmoji = useCallback(
        (data: EmojiData) => {
            editor.focus(() => {
                editor.update(() => {
                    const selection = $getSelection()
                    const emojiNode = $createEmojiNode('', (data as BaseEmoji).native)
                    if ($isRangeSelection(selection)) {
                        selection.insertNodes([emojiNode])
                    }
                })
            })
        },
        [editor],
    )

    const absoluteRef = useRef<HTMLDivElement>(null)

    const [linkLinkModal, setLinkModal] = useState(false)
    const onHideModal = useEvent(() => {
        setLinkModal(false)
    })

    const onLinkClick = useEvent(() => {
        setLinkModal(true)
    })

    const onSaveLink = useEvent((url: string) => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    })
    const [toolbarPosition, setToolbarPosition] = useState<{
        top: number
        left: number
    }>()

    const updateToolbarPosition = useCallback(() => {
        const selection = $getSelection()
        const nativeSelection = window.getSelection()
        const rootElement = editor.getRootElement()

        if (
            selection !== null &&
            nativeSelection !== null &&
            !nativeSelection.isCollapsed &&
            rootElement !== null &&
            rootElement.contains(nativeSelection.anchorNode)
        ) {
            const domRange = nativeSelection.getRangeAt(0)
            let rect

            if (nativeSelection.anchorNode === rootElement) {
                let inner = rootElement
                while (inner.firstElementChild != null) {
                    inner = inner.firstElementChild as HTMLElement
                }
                rect = inner.getBoundingClientRect()
            } else {
                rect = domRange.getBoundingClientRect()
            }

            const parentBounds = absoluteRef.current?.getBoundingClientRect()

            if (!parentBounds) {
                return
            }

            setToolbarPosition({
                top: rect.top - parentBounds.top,
                left: rect.left - parentBounds.left,
            })
        }
    }, [editor])

    const onCloseToolbar = useEvent(() => {
        setToolbarPosition(undefined)
    })

    useEffect(() => {
        const onResize = () => {
            editor.getEditorState().read(() => {
                updateToolbarPosition()
            })
        }
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('resize', onResize)
        }
    }, [editor, updateToolbarPosition])

    useEffect(() => {
        editor.getEditorState().read(() => {
            updateToolbarPosition()
        })
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateToolbarPosition()
                })
            }),

            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateToolbarPosition()
                    return false
                },
                COMMAND_PRIORITY_LOW,
            ),
        )
    }, [editor, updateToolbarPosition])

    const { rootLayerRef } = useContext(RootLayerContext)

    return (
        <Stack
            gap
            rounded="sm"
            background={background}
            minWidth={props.readOnly ? undefined : '200'}
            position="relative"
            minHeight="x6"
            justifyContent="center"
        >
            <Stack horizontal alignItems="center" gap="lg" paddingX="md">
                <Box grow>{props.children}</Box>
                <Stack horizontal gap="xs" color="gray2" alignItems="start" paddingY="sm">
                    {!props.editing ? <GiphyEntry threadId={props.threadId} /> : null}
                    <EmojiPickerButton onSelectEmoji={onSelectEmoji} />
                </Stack>
                {rootLayerRef?.current &&
                    createPortal(
                        <Box absoluteFill padding="lg" ref={absoluteRef} pointerEvents="none">
                            <InlineToolbar
                                position={toolbarPosition}
                                onClose={onCloseToolbar}
                                onAddLinkClick={onLinkClick}
                            />
                        </Box>,
                        rootLayerRef?.current,
                    )}
                {linkLinkModal && <AddLinkModal onHide={onHideModal} onSaveLink={onSaveLink} />}
            </Stack>
        </Stack>
    )
}
