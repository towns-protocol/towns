import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React, { ComponentProps, useCallback, useEffect, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { $getSelection, COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from 'lexical'
import { mergeRegister } from '@lexical/utils'
import { useDevice } from 'hooks/useDevice'
import { Box, BoxProps, MotionBox, Stack, useZLayerContext } from '@ui'
import { GiphyEntryDesktop } from '@components/Giphy/GiphyEntry'
import { OfflineIndicator } from '@components/RichTextPlate/components/OfflineIndicator'
import { RichTextToolbar } from './RichTextToolbar'
import { AddLinkModal } from './LinkModal'
import { InlineToolbar } from './InlineToolbar'

type Props = {
    children: React.ReactNode
    editing?: boolean
    focused: boolean
    readOnly?: boolean
    background?: BoxProps['background']
    attemptingToSend?: boolean
    rounded?: BoxProps['rounded']
    showFormattingToolbar: boolean
    canShowInlineToolbar: boolean
} & ComponentProps<typeof GiphyEntryDesktop>

export const RichTextUI = (props: Props) => {
    const [editor] = useLexicalComposerContext()
    const { isTouch } = useDevice()
    const { showFormattingToolbar, canShowInlineToolbar } = props
    const absoluteRef = useRef<HTMLDivElement>(null)

    const [linkLinkModal, setLinkModal] = useState(false)
    const onHideModal = useEvent(() => {
        setLinkModal(false)
    })

    const onLinkClick = useEvent(() => {
        if (isTouch) {
            const text = prompt('Add Link', 'https://')
            editor.focus()
            if (!text) {
                return
            }
            if (text.length < 1) {
                return
            }
            onSaveLink(text || '')
        } else {
            setLinkModal(true)
        }
    })

    const onSaveLink = useEvent((url: string) => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    })

    const [toolbarPosition, setToolbarPosition] = useState<{
        top: number
        left: number | string
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
                left: isTouch ? '50%' : rect.left - parentBounds.left,
            })
        }
    }, [editor, isTouch])

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

    const { rootLayerRef } = useZLayerContext()

    return (
        <>
            <AnimatePresence>
                {showFormattingToolbar && (
                    <MotionBox
                        overflow="hidden"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Box paddingTop="sm" paddingX="sm">
                            <RichTextToolbar
                                focused={props.focused ?? false}
                                key="toolbar"
                                onAddLinkClick={onLinkClick}
                            />
                        </Box>
                    </MotionBox>
                )}
            </AnimatePresence>

            <RichTextUIContainer
                key="editor"
                readOnly={props.readOnly}
                background={props.background}
            >
                <Box
                    position="relative"
                    paddingX="md"
                    width="100%"
                    minHeight={{ default: 'x6', touch: 'x5' }}
                >
                    {props.children}
                </Box>
                {canShowInlineToolbar &&
                    !isTouch &&
                    rootLayerRef?.current &&
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
                <OfflineIndicator attemptingToSend={props.attemptingToSend} />
            </RichTextUIContainer>
        </>
    )
}

export const RichTextUIContainer = ({
    background = 'level2',
    rounded = 'sm',
    readOnly,
    children,
}: Pick<Props, 'background' | 'readOnly' | 'rounded'> & { children?: React.ReactNode }) => (
    <Stack
        transition
        minWidth={readOnly ? undefined : '200'}
        position="relative"
        justifyContent="center"
        minHeight="x6"
        background={background}
        rounded={rounded}
    >
        {children}
    </Stack>
)
