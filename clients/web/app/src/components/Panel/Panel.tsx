import React, { useCallback, useEffect, useState } from 'react'
import Sheet from 'react-modal-sheet'
import { AnimatePresence } from 'framer-motion'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { useDevice } from 'hooks/useDevice'
import { transitions } from 'ui/transitions/transitions'
import { useSafeEscapeKeyCancellation } from 'hooks/useSafeEscapeKeyCancellation'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { Card, CardLabel } from '@ui'
import { Box, BoxProps } from '../../ui/components/Box/Box'
import { Stack } from '../../ui/components/Stack/Stack'
import { useZLayerContext } from '../../ui/components/ZLayer/ZLayer'

type Props = {
    children: React.ReactNode
    label?: React.ReactNode | string
    paddingX?: BoxProps['padding']
    modalPresentable?: boolean
    leftBarButton?: React.ReactNode
    rightBarButton?: React.ReactNode
    onClose?: () => void
    background?: BoxProps['background']
} & Omit<BoxProps, 'label'>

export const Panel = (props: Props) => {
    const { isTouch } = useDevice()
    return isTouch ? <TouchPanel {...props} /> : <DesktopPanel {...props} />
}

const DesktopPanel = ({ modalPresentable, ...rest }: Props) => {
    const { onClose, rightBarButton, leftBarButton, label, ...boxProps } = rest
    useSafeEscapeKeyCancellation({ onEscape: onClose, capture: false })

    return (
        <Card absoluteFill>
            <CardLabel
                label={label}
                leftBarButton={leftBarButton}
                rightBarButton={rightBarButton}
                onClose={onClose}
            />
            <PanelContent {...boxProps} />
        </Card>
    )
}

const TouchPanel = (props: Props) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onClose, rightBarButton, leftBarButton, label, ...boxProps } = props
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
            detent="full-height"
            mountPoint={mountPoint}
            onClose={closeModal}
            onCloseEnd={didCloseModal}
        >
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content>
                    <Box
                        paddingX
                        maxHeight="100svh"
                        overflow="auto"
                        paddingBottom="safeAreaInsetBottom"
                    >
                        {props.children}
                    </Box>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={closeModal} />
        </Sheet>
    ) : (
        <AnimatePresence>
            {modalPresented && (
                <ZLayerBox
                    layoutScroll
                    absoluteFill
                    initial={{ x: '100%' }}
                    animate={{ x: '0%' }}
                    exit={{ x: '100%' }}
                    transition={transitions.panel}
                    background="level1"
                    zIndex="tooltips"
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
                    {/* note: for vlist this following config would be ideal:  <Box grow overflow="hidden" position="relative"> */}
                    <PanelContent {...boxProps}>{props.children}</PanelContent>
                </ZLayerBox>
            )}
        </AnimatePresence>
    )
}

const PanelContent = (props: BoxProps) => <Stack grow scroll padding gap {...props} />
