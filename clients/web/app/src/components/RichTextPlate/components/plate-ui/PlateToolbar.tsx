import React, { ComponentProps, useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useEvent } from 'react-use-event-hook'
import { useEditorRef } from '@udecode/plate-common'
import { focusEditor } from '@udecode/slate-react'
import { MARK_BOLD, MARK_CODE, MARK_ITALIC, MARK_STRIKETHROUGH } from '@udecode/plate-basic-marks'
import { upsertLink } from '@udecode/plate-link'
import { ListStyleType } from '@udecode/plate-indent-list'
import { Box, BoxProps, DividerEditorToolbar, MotionBox, Stack } from '@ui'
import { GiphyEntryDesktop } from '@components/Giphy/GiphyEntry'
import { useDevice } from 'hooks/useDevice'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import { ListToolbarButton } from './ListToolbarButton'
import { AddLinkModal } from './LinkModal'
import { MarkToolbarButton } from './MarkToolbarButton'
import { LinkToolbarButton } from './LinkToolbarButton'
import { CodeBlockToolbarButton } from './CodeBlockToolbarButton'
import { BlockQuoteToolbarButton } from './BlockQuoteToolbarButton'

type Props = {
    editing?: boolean
    focused: boolean
    readOnly?: boolean
    background?: BoxProps['background']
    attemptingToSend?: boolean
    rounded?: BoxProps['rounded']
    showFormattingToolbar: boolean
    canShowInlineToolbar: boolean
} & ComponentProps<typeof GiphyEntryDesktop>
export const PlateToolbar = ({ showFormattingToolbar, focused }: Props) => {
    const [linkLinkModal, setLinkModal] = useState(false)
    const { isTouch } = useDevice()
    const editor = useEditorRef()

    const onToolbarPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault()
    }, [])

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

    const onSaveLink = useEvent((url: string) => {
        upsertLink(editor, { url })
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
                                gap="xs"
                                pointerEvents="auto"
                                width="100%"
                                opacity={focused ? 'opaque' : '0.4'}
                                zIndex="tooltips"
                                onPointerDown={onToolbarPointerDown}
                            >
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
                                />
                                <ListToolbarButton
                                    nodeType={ListStyleType.Disc}
                                    icon="bulletedlist"
                                    tooltip="Bulleted list"
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
