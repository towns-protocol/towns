import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_LOW,
    SELECTION_CHANGE_COMMAND,
} from 'lexical'
import React, { ComponentProps, useCallback, useEffect, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { Box, BoxProps, Icon, Paragraph, Stack, useZLayerContext } from '@ui'
import { GiphyEntryDesktop } from '@components/Giphy/GiphyEntry'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { FadeInBox } from '@components/Transitions'
import { useNetworkStatus } from 'hooks/useNetworkStatus'
import { useDevice } from 'hooks/useDevice'
import { $createEmojiNode } from '../nodes/EmojiNode'
import { InlineToolbar } from './InlineToolbar'
import { AddLinkModal } from './LinkModal'

type Props = {
    children: React.ReactNode
    editing?: boolean
    focused: boolean
    readOnly?: boolean
    background?: BoxProps['background']
    attemptingToSend?: boolean
    rounded?: BoxProps['rounded']
} & ComponentProps<typeof GiphyEntryDesktop>

export const RichTextUI = (props: Props) => {
    const { background = 'level2' } = props
    const [editor] = useLexicalComposerContext()
    const { isTouch } = useDevice()

    const onSelectEmoji = useCallback(
        (data: EmojiPickerSelection) => {
            editor.focus(() => {
                editor.update(() => {
                    const selection = $getSelection()
                    const emojiNode = $createEmojiNode('', data.native)
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
        if (isTouch) {
            const text = prompt('Add Link', 'https://')
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
        <RichTextUIContainer key="editor" background={background} readOnly={props.readOnly}>
            <Stack horizontal alignItems="center" gap="lg" paddingX="md">
                <Box grow>{props.children}</Box>
                <Stack horizontal gap="xs" color="gray2" alignItems="start" paddingY="sm">
                    {!isTouch && (
                        <>
                            {!props.editing ? (
                                <GiphyEntryDesktop
                                    threadId={props.threadId}
                                    threadPreview={props.threadPreview}
                                />
                            ) : null}
                            <EmojiPickerButton onSelectEmoji={onSelectEmoji} />
                        </>
                    )}
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
            <OfflineIndicator attemptingToSend={props.attemptingToSend} />
        </RichTextUIContainer>
    )
}

export const RichTextUIContainer = ({
    background = 'level2',
    rounded = 'sm',
    readOnly,
    children,
}: Pick<Props, 'background' | 'readOnly' | 'rounded'> & { children?: React.ReactNode }) => (
    <Stack
        gap
        transition
        rounded={rounded}
        background={background}
        minWidth={readOnly ? undefined : '200'}
        position="relative"
        minHeight="x6"
        justifyContent="center"
    >
        {children}
    </Stack>
)

const OfflineIndicator = (props: { attemptingToSend?: boolean }) => {
    const { isOffline } = useNetworkStatus()
    let message = 'Your connection appears to be offline.'
    if (props.attemptingToSend) {
        message = [message, 'Please try again when back online...'].join(' ')
    }
    return (
        <AnimatePresence>
            {isOffline ? (
                <FadeInBox
                    horizontal
                    key={message}
                    gap="xs"
                    position="bottomLeft"
                    style={{ transform: `translateY(100%)` }}
                    paddingY="xxs"
                    color="error"
                    alignItems="center"
                >
                    <Icon type="offline" size="square_sm" />
                    <Paragraph size="sm">{message}</Paragraph>
                </FadeInBox>
            ) : null}
        </AnimatePresence>
    )
}
