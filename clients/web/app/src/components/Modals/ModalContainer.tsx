import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Box, BoxProps, MotionBox, Stack, useZLayerContext } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSafeEscapeKeyCancellation } from 'hooks/useSafeEscapeKeyCancellation'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { transitions } from 'ui/transitions/transitions'

type Props = {
    children: React.ReactNode
    onHide: () => void
    minWidth?: BoxProps['minWidth']
    stableTopAlignment?: boolean
    /** with touchTitle present, the modal will be presented full screen on touch screens */
    touchTitle?: string
    rightBarButton?: React.ReactNode
}

export const ModalContainer = (props: Props) => {
    const root = useZLayerContext().rootLayerRef?.current
    const { isTouch } = useDevice()
    const { onHide, touchTitle, rightBarButton } = props

    if (!root) {
        console.error(`no root context declared for use of modal`)
        return null
    }

    return createPortal(
        isTouch && touchTitle ? (
            <TouchFullScreenModalContainer
                title={touchTitle}
                rightBarButton={rightBarButton}
                onHide={onHide}
            >
                {props.children}
            </TouchFullScreenModalContainer>
        ) : (
            <CenteredModalContainer {...props} />
        ),
        root,
    )
}

type TouchFullScreenModalContainerProps = {
    children: React.ReactNode
    title: string
    onHide: () => void
    rightBarButton?: React.ReactNode
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
                    background="level1"
                    pointerEvents="auto"
                    zIndex="tooltips"
                >
                    {/* this box makes sure the UI below doesn't bleed through while spring animating */}
                    <Box
                        background="level1"
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

export const CenteredModalContainer = (props: Props) => {
    const { isTouch } = useDevice()
    const minWidth: BoxProps['minWidth'] = isTouch ? '100%' : props.minWidth || '600'
    const { onHide } = props

    useSafeEscapeKeyCancellation({ onEscape: onHide, capture: true })

    return (
        <Box>
            <Box
                absoluteFill
                cursor="crosshair"
                style={{ background: `rgba(0,0,0,0.3)`, backdropFilter: `blur(4px)` }}
                pointerEvents="auto"
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
                <Box
                    padding
                    border
                    rounded="md"
                    background="level1"
                    minWidth={minWidth}
                    pointerEvents="auto"
                >
                    {props.children}
                </Box>
            </Box>
        </Box>
    )
}
