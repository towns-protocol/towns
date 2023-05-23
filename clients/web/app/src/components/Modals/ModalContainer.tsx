import React, { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, BoxProps, Icon, Stack, Text, useZLayerContext } from '@ui'
import { useDevice } from 'hooks/useDevice'

type Props = {
    children: React.ReactNode
    onHide: () => void
    minWidth?: BoxProps['minWidth']
    stableTopAlignment?: boolean
    /** with touchTitle present, the modal will be presented full screen on touch screens */
    touchTitle?: string
}

export const ModalContainer = (props: Props) => {
    const root = useZLayerContext().rootLayerRef?.current
    const { isMobile } = useDevice()
    const { onHide, touchTitle } = props

    if (!root) {
        console.error(`no root context declared for use of modal`)
        return null
    }

    return createPortal(
        isMobile && touchTitle ? (
            <TouchFullScreenModalContainer title={touchTitle} onHide={onHide}>
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
}

const TouchFullScreenModalContainer = (props: TouchFullScreenModalContainerProps) => {
    const { children, title, onHide } = props
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
                    initial={{ x: '100%' }}
                    animate={{ x: '0%' }}
                    exit={{ x: '100%' }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                    background="level1"
                    pointerEvents="auto"
                    zIndex="tooltips"
                >
                    <Stack>
                        <Stack paddingX horizontal borderBottom gap alignItems="center" height="x8">
                            <Icon type="back" color="gray1" onClick={onClose} />
                            <Text fontWeight="strong">{title}</Text>
                        </Stack>
                        <Stack
                            scroll
                            paddingX
                            paddingTop="md"
                            paddingBottom="safeAreaInsetBottom"
                            height="100svh"
                        >
                            {/* Hack to force bounce scroll */}
                            <Box style={{ minHeight: '101svh' }}>{children}</Box>
                        </Stack>
                    </Stack>
                </MotionBox>
            )}
        </AnimatePresence>
    )
}

const CenteredModalContainer = (props: Props) => {
    const { isMobile } = useDevice()
    const minWidth: BoxProps['minWidth'] = isMobile ? '100%' : props.minWidth || '600'

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

const MotionBox = motion(Box)
