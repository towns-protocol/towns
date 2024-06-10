import React, { ComponentProps, useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import linkifyit from 'linkify-it'
import { useEvent } from 'react-use-event-hook'
import { useEditorRef } from '@udecode/plate-common'
import { getEditorString } from '@udecode/slate'
import { focusEditor } from '@udecode/slate-react'
import { MARK_BOLD, MARK_CODE, MARK_ITALIC, MARK_STRIKETHROUGH } from '@udecode/plate-basic-marks'
import { upsertLink } from '@udecode/plate-link'
import { ListStyleType } from '@udecode/plate-indent-list'
import { Box, BoxProps, DividerEditorToolbar, IconButton, MotionBox, Stack } from '@ui'
import { GiphyEntryDesktop } from '@components/Giphy/GiphyEntry'
import { useDevice } from 'hooks/useDevice'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import { ListToolbarButton } from './ListToolbarButton'
import { AddLinkModal } from './LinkModal'
import { MarkToolbarButton } from './MarkToolbarButton'
import { LinkToolbarButton } from './LinkToolbarButton'
import { CodeBlockToolbarButton } from './CodeBlockToolbarButton'
import { BlockQuoteToolbarButton } from './BlockQuoteToolbarButton'

const linkify = linkifyit()

type Props = {
    editing?: boolean
    focused: boolean
    readOnly?: boolean
    background?: BoxProps['background']
    attemptingToSend?: boolean
    rounded?: BoxProps['rounded']
    showFormattingToolbar: boolean
    setIsFormattingToolbarOpen: (isFormattingToolbarOpen: boolean) => void
} & ComponentProps<typeof GiphyEntryDesktop>
export const PlateToolbar = ({
    showFormattingToolbar,
    setIsFormattingToolbarOpen,
    focused,
}: Props) => {
    const [linkLinkModal, setLinkModal] = useState(false)
    const { isTouch } = useDevice()
    const editor = useEditorRef()

    const onToolbarPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault()
    }, [])

    const closeFormattingToolbar = useCallback(
        (e: React.TouchEvent) => {
            e.stopPropagation()
            e.preventDefault()
            setIsFormattingToolbarOpen(false)
        },
        [setIsFormattingToolbarOpen],
    )

    const onLinkClick = useEvent(() => {
        if (isTouch) {
            const text = prompt('Add Link', 'https://')
            focusEditor(editor)
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

    const onSaveLink = useEvent((text: string) => {
        const parsedLink = linkify.match(text)?.[0]
        if (!parsedLink) {
            return
        }

        // If user has selected a text, we do not want to override it with the
        // user's inputted link which may not be correctly formatted and let
        // PlateJS handle it internally but adding an HREF over initially selected text
        const selectionText = getEditorString(editor, editor.selection)
        const linkText = selectionText ? undefined : parsedLink.text

        upsertLink(editor, { url: parsedLink.url, text: linkText })
    })

    const onHideModal = useEvent(() => {
        setLinkModal(false)
    })

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
                            <Stack
                                horizontal
                                overflowX="scroll"
                                gap={isTouch ? 'sm' : 'xs'}
                                pointerEvents="auto"
                                width="100%"
                                opacity={focused ? 'opaque' : '0.4'}
                                zIndex="tooltips"
                                onPointerDown={onToolbarPointerDown}
                            >
                                {isTouch && (
                                    <IconButton
                                        opaque
                                        icon="close"
                                        onTouchStart={closeFormattingToolbar}
                                    />
                                )}
                                <MarkToolbarButton
                                    nodeType={MARK_BOLD}
                                    icon="bold"
                                    tooltip={ShortcutTooltip({ action: 'BoldText' })}
                                />
                                <MarkToolbarButton
                                    nodeType={MARK_ITALIC}
                                    icon="italic"
                                    tooltip={ShortcutTooltip({ action: 'ItalicText' })}
                                />
                                <MarkToolbarButton
                                    nodeType={MARK_STRIKETHROUGH}
                                    icon="strikethrough"
                                    tooltip="Strikethrough"
                                />
                                <LinkToolbarButton onClick={onLinkClick} />
                                <DividerEditorToolbar />
                                <ListToolbarButton
                                    nodeType={ListStyleType.Decimal}
                                    icon="numberedlist"
                                    tooltip="Ordered list"
                                    editor={editor}
                                />
                                <ListToolbarButton
                                    nodeType={ListStyleType.Disc}
                                    icon="bulletedlist"
                                    tooltip="Bulleted list"
                                    editor={editor}
                                />
                                <DividerEditorToolbar />
                                <BlockQuoteToolbarButton />
                                <DividerEditorToolbar />
                                <MarkToolbarButton
                                    nodeType={MARK_CODE}
                                    icon="code"
                                    tooltip="Code"
                                />
                                <CodeBlockToolbarButton />
                            </Stack>
                        </Box>
                    </MotionBox>
                )}
            </AnimatePresence>
            {linkLinkModal && <AddLinkModal onHide={onHideModal} onSaveLink={onSaveLink} />}
        </>
    )
}
