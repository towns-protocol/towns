import React, { ComponentProps, useCallback, useMemo } from 'react'
import { AnimationProps } from 'framer-motion'
import { useEditorRef } from '@udecode/plate-common/react'
import { withRef } from '@udecode/cn'
import {
    BoldPlugin,
    CodePlugin,
    ItalicPlugin,
    StrikethroughPlugin,
    UnderlinePlugin,
} from '@udecode/plate-basic-marks/react'
import { BaseBulletedListPlugin, BaseNumberedListPlugin } from '@udecode/plate-list'
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

export const FormattingToolbar = withRef<typeof MotionBox, FormattingToolbarProps>(
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
                            data-testid="editor-formatting-toolbar"
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
                                    nodeType={BoldPlugin.key}
                                    icon="bold"
                                    tooltip={ShortcutTooltip({ action: 'BoldText' })}
                                />
                                <MarkToolbarButton
                                    nodeType={ItalicPlugin.key}
                                    icon="italic"
                                    tooltip={ShortcutTooltip({ action: 'ItalicText' })}
                                />
                                <MarkToolbarButton
                                    nodeType={UnderlinePlugin.key}
                                    icon="underline"
                                    tooltip={ShortcutTooltip({ action: 'UnderlineText' })}
                                />
                                <MarkToolbarButton
                                    nodeType={StrikethroughPlugin.key}
                                    icon="strikethrough"
                                    tooltip="Strikethrough"
                                />
                                <LinkToolbarButton onClick={onLinkClick} />
                                <DividerEditorToolbar />
                                <ListToolbarButton
                                    nodeType={BaseNumberedListPlugin.key}
                                    icon="numberedlist"
                                    tooltip="Ordered list"
                                    editor={editor}
                                />
                                <ListToolbarButton
                                    nodeType={BaseBulletedListPlugin.key}
                                    icon="bulletedlist"
                                    tooltip="Bulleted list"
                                    editor={editor}
                                />
                                <DividerEditorToolbar />
                                <BlockQuoteToolbarButton />
                                <DividerEditorToolbar />
                                <MarkToolbarButton
                                    nodeType={CodePlugin.key}
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
