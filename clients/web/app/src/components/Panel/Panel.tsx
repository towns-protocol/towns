import React, { useCallback, useEffect, useState } from 'react'
import Sheet from 'react-modal-sheet'
import { AnimatePresence } from 'framer-motion'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { useDevice } from 'hooks/useDevice'
import { transitions } from 'ui/transitions/transitions'
import { useSafeEscapeKeyCancellation } from 'hooks/useSafeEscapeKeyCancellation'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { Box, BoxProps } from '../../ui/components/Box/Box'
import { IconButton } from '../../ui/components/IconButton/IconButton'
import { Stack } from '../../ui/components/Stack/Stack'
import { useZLayerContext } from '../../ui/components/ZLayer/ZLayer'
import { MotionStack } from '../../ui/components/Motion/MotionComponents'

type Props = {
    children: React.ReactNode
    label?: React.ReactNode | string
    paddingX?: BoxProps['padding']
    modalPresentable?: boolean
    rightBarButton?: React.ReactNode
    onClose?: () => void
}

export const Panel = (props: Props) => {
    const { isTouch } = useDevice()
    return isTouch ? <TouchPanel {...props} /> : <DesktopPanel {...props} />
}

const DesktopPanel = (props: Props) => {
    const { paddingX = 'md', onClose, rightBarButton } = props
    useSafeEscapeKeyCancellation({ onEscape: onClose, capture: false })

    return (
        <Stack height="100%" background="level1">
            <Stack
                horizontal
                hoverable
                borderBottom
                shrink={false}
                paddingX={paddingX}
                background="level2"
                height="x8"
                alignItems="center"
                color="gray1"
                justifySelf="start"
            >
                <Stack grow color="gray2">
                    {props.label}
                </Stack>
                <Stack>
                    {props.onClose && <IconButton icon="close" onClick={props.onClose} />}
                </Stack>
                {rightBarButton && (
                    <>
                        <Stack grow />
                        {rightBarButton}
                    </>
                )}
            </Stack>
            <Stack grow scroll>
                {props.children}
            </Stack>
        </Stack>
    )
}

const TouchPanel = (props: Props) => {
    const { onClose, rightBarButton } = props
    const mountPoint = useZLayerContext().rootLayerRef?.current ?? undefined
    const [modalPresented, setModalPresented] = useState(false)
    const modalPresentable = props.modalPresentable ?? false

    const closeModal = useCallback(() => {
        setModalPresented(false)
    }, [])

    const didCloseModal = useCallback(() => {
        onClose?.()
    }, [onClose])

    const closePanel = useCallback(() => {
        setModalPresented(false)
        setTimeout(() => {
            onClose?.()
        }, transitions.panelAnimationDuration * 1000)
    }, [onClose])

    useEffect(() => {
        setModalPresented(true)
    }, [])

    return modalPresentable ? (
        <Sheet
            className={modalSheetClass}
            isOpen={modalPresented}
            detent="content-height"
            mountPoint={mountPoint}
            onClose={closeModal}
            onCloseEnd={didCloseModal}
        >
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content>
                    <Box maxHeight="100svh" overflow="auto" paddingBottom="safeAreaInsetBottom">
                        {props.children}
                    </Box>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={closeModal} />
        </Sheet>
    ) : (
        <AnimatePresence>
            {modalPresented && (
                <MotionStack
                    absoluteFill
                    grow
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: '0%', opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={transitions.panel}
                    background="level1"
                    zIndex="tooltips"
                    height="100svh"
                    overflowX="hidden"
                >
                    {/* this box makes sure the UI below doesn't bleed through while spring animating */}
                    <Box
                        background="level1"
                        style={{ position: 'absolute', right: -100, top: 0, bottom: 0, width: 100 }}
                    />
                    <TouchPanelNavigationBar
                        title={props.label}
                        rightBarButton={rightBarButton}
                        onBack={closePanel}
                    />
                    <Stack scroll scrollbars grow>
                        <Box grow paddingBottom="safeAreaInsetBottom">
                            {props.children}
                        </Box>
                    </Stack>
                </MotionStack>
            )}
        </AnimatePresence>
    )
}

export const PanelButton = ({
    tone,
    ...props
}: Omit<BoxProps, 'color'> & { tone?: 'negative' | 'positive' }) => (
    <Box
        border
        horizontal
        padding
        transition
        hoverable
        cursor="pointer"
        height="x6"
        as="button"
        rounded="sm"
        background="level2"
        color={{
            default: tone,
            hover: tone,
        }}
        justifyContent="start"
        alignItems="center"
        gap="sm"
        {...props}
    />
)
