import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Sheet from 'react-modal-sheet'
import { Box, BoxProps, MotionBox, Stack, useZLayerContext } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSafeEscapeKeyCancellation } from 'hooks/useSafeEscapeKeyCancellation'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { transitions } from 'ui/transitions/transitions'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'

export type ModalContainerProps = {
    children: React.ReactNode
    onHide: () => void
    minWidth?: BoxProps['minWidth']
    stableTopAlignment?: boolean
    /** with touchTitle present, the modal will be presented full screen on touch screens */
    touchTitle?: string
    rightBarButton?: React.ReactNode
    padding?: BoxProps['padding']
    border?: BoxProps['border']
    rootLayer?: HTMLElement
    background?: BoxProps['background']
    asSheet?: boolean
}

export const ModalContainer = (props: ModalContainerProps) => {
    const zLayerRoot = useZLayerContext().rootLayerRef?.current
    const root = props.rootLayer ?? zLayerRoot
    const { isTouch } = useDevice()
    const { onHide, touchTitle, rightBarButton, asSheet, background, children } = props

    const content = useMemo(() => {
        if (isTouch) {
            if (touchTitle) {
                return (
                    <TouchFullScreenModalContainer
                        title={touchTitle}
                        rightBarButton={rightBarButton}
                        background={background}
                        onHide={onHide}
                    >
                        {children}
                    </TouchFullScreenModalContainer>
                )
            }
            if (asSheet) {
                // TODO: looks like the sheet start animation (moving from bottom to top) is not working
                return (
                    <Sheet
                        isOpen
                        detent="content-height"
                        className={modalSheetClass}
                        onClose={onHide}
                    >
                        <Sheet.Container>
                            <Sheet.Header />
                            <Sheet.Content>
                                <Stack
                                    paddingX="sm"
                                    paddingBottom="lg"
                                    alignContent="start"
                                    gap="sm"
                                >
                                    {children}
                                </Stack>
                            </Sheet.Content>
                        </Sheet.Container>
                        <Sheet.Backdrop onTap={onHide} />
                    </Sheet>
                )
            }
        }
        return <CenteredModalContainer {...props} />
    }, [asSheet, background, children, isTouch, onHide, props, rightBarButton, touchTitle])

    if (!root) {
        console.error(`no root context declared for use of modal`)
        return null
    }

    return createPortal(content, root)
}

type TouchFullScreenModalContainerProps = {
    children: React.ReactNode
    title: string
    onHide: () => void
    rightBarButton?: React.ReactNode
    background?: BoxProps['background']
}

const TouchFullScreenModalContainer = (props: TouchFullScreenModalContainerProps) => {
    const { children, title, rightBarButton, onHide } = props
    const [contentVisible, setContentVisible] = React.useState(false)

    useEffect(() => {
        setContentVisible(true)
    }, [setContentVisible])

    const onClose = useCallback(() => {
        setContentVisible(false)
        setTimeout(onHide, 300)
    }, [onHide])

    return (
        <AnimatePresence>
            {contentVisible && (
                <MotionBox
                    absoluteFill
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: '0%', opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={transitions.panel}
                    background={props.background ?? 'level1'}
                    pointerEvents="auto"
                    zIndex="tooltips"
                >
                    {/* this box makes sure the UI below doesn't bleed through while spring animating */}
                    <Box
                        background={props.background ?? 'level1'}
                        style={{ position: 'absolute', right: -100, top: 0, bottom: 0, width: 100 }}
                    />
                    <Stack height="100%">
                        <TouchPanelNavigationBar
                            title={title}
                            rightBarButton={rightBarButton}
                            onBack={onClose}
                        />

                        <Stack scroll scrollbars height="100%">
                            {children}
                        </Stack>
                    </Stack>
                </MotionBox>
            )}
        </AnimatePresence>
    )
}

export const CenteredModalContainer = (props: ModalContainerProps) => {
    const { isTouch } = useDevice()
    const minWidth: BoxProps['minWidth'] = props.minWidth
        ? props.minWidth
        : isTouch
        ? '100%'
        : '600'
    const { onHide } = props

    useSafeEscapeKeyCancellation({ onEscape: onHide, capture: true })

    return (
        <Box>
            <MotionBox
                absoluteFill
                cursor="crosshair"
                background={props.background ?? 'modalContainer'}
                pointerEvents="auto"
                transition={{
                    type: 'spring',
                    damping: 50,
                    stiffness: 500,
                    restDelta: 0.01,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={props.onHide}
            />
            <Box
                absoluteFill
                justifyContent={props.stableTopAlignment ? undefined : 'center'}
                alignItems="center"
                pointerEvents="none"
                padding="md"
                style={
                    props.stableTopAlignment
                        ? {
                              top: '45%',
                              transform: 'translateY(-50%)',
                          }
                        : undefined
                }
            >
                <MotionBox
                    border={props.border ?? 'default'}
                    overflow="hidden"
                    padding={props.padding ?? 'md'}
                    rounded="md"
                    background="level1"
                    minWidth={minWidth}
                    pointerEvents="auto"
                    style={{ maxWidth: `calc(100vw - 100px)`, maxHeight: `calc(100vh - 32px)` }}
                    transition={{
                        type: 'spring',
                        damping: 50,
                        stiffness: 500,
                        restDelta: 0.01,
                    }}
                    initial={{ y: 8 }}
                    animate={{ y: 0 }}
                    exit={{ y: 8 }}
                >
                    {props.children}
                </MotionBox>
            </Box>
        </Box>
    )
}
