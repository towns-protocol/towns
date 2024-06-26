import React, { ComponentProps, useCallback, useMemo } from 'react'
import { AnimationProps } from 'framer-motion'
import { useEditorRef } from '@udecode/plate-common'
import { withRef } from '@udecode/cn'
import { MARK_BOLD, MARK_CODE, MARK_ITALIC, MARK_STRIKETHROUGH } from '@udecode/plate-basic-marks'
import { ListStyleType } from '@udecode/plate-indent-list'
import { Box, BoxProps, DividerEditorToolbar, IconButton, MotionBox, Stack } from '@ui'
import { GiphyEntryDesktop } from '@components/Giphy/GiphyEntry'
import { useDevice } from 'hooks/useDevice'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import { ListToolbarButton } from './ListToolbarButton'
import { MarkToolbarButton } from './MarkToolbarButton'
import { LinkToolbarButton } from './LinkToolbarButton'
import { CodeBlockToolbarButton } from './CodeBlockToolbarButton'
import { BlockQuoteToolbarButton } from './BlockQuoteToolbarButton'

export type FormattingToolbarProps = {
    editing?: boolean
    focused: boolean
    readOnly?: boolean
    background?: BoxProps['background']
    isFloating?: boolean
    onLinkClick: () => void
    attemptingToSend?: boolean
    rounded?: BoxProps['rounded']
    showFormattingToolbar: boolean
    setIsFormattingToolbarOpen: (isFormattingToolbarOpen: boolean) => void
} & ComponentProps<typeof GiphyEntryDesktop>

export const FormattingToolbar = withRef<'div', FormattingToolbarProps>(
    (
        { showFormattingToolbar, setIsFormattingToolbarOpen, focused, isFloating, onLinkClick },
        ref,
    ) => {
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

        const toolbarAnimationProps = useMemo(() => {
            if (isFloating) {
                return {
                    initial: { opacity: 0, y: 4 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, transition: { duration: 0 } },
                }
            } else if (isTouch) {
                return {
                    initial: { opacity: 0, width: 0 },
                    animate: { opacity: 1, width: 'auto' },
                    exit: { opacity: 0, width: 0, transition: { duration: 0 } },
                } as AnimationProps
            } else {
                return {
                    initial: { opacity: 0, height: 0 },
                    animate: { opacity: 1, height: 'auto' },
                    exit: { opacity: 0, height: 0 },
                } as AnimationProps
            }
        }, [isFloating, isTouch])

        const { floatingProps, floatingContainerProps } = useMemo(() => {
            if (isFloating) {
                return {
                    floatingProps: {
                        padding: 'xs',
                        rounded: 'sm',

                        border: 'faint',
                        style: { boxShadow: '6px 2px 6px rgba(0,0,0,0.1)' },
                    } as BoxProps,
                    floatingContainerProps: {
                        padding: 'paragraph',
                    } as BoxProps,
                }
            }
            return { floatingProps: {}, floatingContainerProps: {} }
        }, [isFloating])

        return (
            <div ref={ref}>
                {showFormattingToolbar && (
                    <MotionBox overflow="hidden" {...toolbarAnimationProps}>
                        <Box
                            paddingTop={isTouch ? 'none' : 'sm'}
                            paddingX="sm"
                            {...floatingContainerProps}
                        >
                            <Stack
                                horizontal
                                background="level2"
                                overflowX="scroll"
                                gap={isTouch ? 'sm' : 'xs'}
                                pointerEvents="auto"
                                width="100%"
                                opacity={focused ? 'opaque' : '0.4'}
                                zIndex="tooltips"
                                onPointerDown={onToolbarPointerDown}
                                {...floatingProps}
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
                                {!isFloating && (
                                    <MarkToolbarButton
                                        nodeType={MARK_STRIKETHROUGH}
                                        icon="strikethrough"
                                        tooltip="Strikethrough"
                                    />
                                )}
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
                                {!isFloating && <BlockQuoteToolbarButton />}
                                {!isFloating && <DividerEditorToolbar />}
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
            </div>
        )
    },
)
