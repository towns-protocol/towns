import React, { ContextType, createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { Sheet } from 'react-modal-sheet'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { useDevice } from 'hooks/useDevice'
import { transitions } from 'ui/transitions/transitions'
import { useSafeEscapeKeyCancellation } from 'hooks/useSafeEscapeKeyCancellation'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { Card, CardLabel, IconButton } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { Box, BoxProps } from '../../ui/components/Box/Box'
import { Stack } from '../../ui/components/Stack/Stack'
import { useZLayerContext } from '../../ui/components/ZLayer/ZLayer'
import { PanelContext, PanelStack } from './PanelContext'

type Props = {
    children: React.ReactNode
    label?: React.ReactNode | string
    paddingX?: BoxProps['padding']
    modalPresentable?: boolean
    rightBarButton?: React.ReactNode
    background?: BoxProps['background']
    onClosed?: () => void
    stackId?: PanelStack
    isRootPanel?: boolean
    parentRoute?: string
} & Omit<BoxProps, 'label'>

const DEFAULT_CONTEXT = {
    stackId: PanelStack.MAIN,
    isRootPanel: false,
}

export const Panel = (props: Props) => {
    const { isTouch } = useDevice()

    const context = useMemo(() => {
        return {
            isPanelContext: true,
            isRootPanel: props.isRootPanel,
            stackId: props.stackId ?? DEFAULT_CONTEXT.stackId,
            parentRoute: props.parentRoute,
        }
    }, [props.isRootPanel, props.parentRoute, props.stackId])

    return (
        <PanelContext.Provider value={context}>
            {isTouch ? <TouchPanel {...props} /> : <DesktopPanel {...props} />}
        </PanelContext.Provider>
    )
}

const DesktopPanel = ({ modalPresentable, onClosed: onCloseProp, ...rest }: Props) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rightBarButton, label, stackId, isRootPanel, parentRoute, ...boxProps } = rest

    const [searchParams] = useSearchParams()
    const stacked = searchParams.get('stacked')

    const { closePanel } = usePanelActions()

    const onClose = useCallback(() => {
        onCloseProp?.()
        closePanel({ preventPopStack: true })
    }, [closePanel, onCloseProp])

    const onPrev = useCallback(() => {
        onCloseProp?.()
        closePanel()
    }, [closePanel, onCloseProp])

    useSafeEscapeKeyCancellation({ onEscape: onClose, capture: false })

    const leftBarButton = stacked ? (
        <IconButton icon="arrowLeft" background="none" insetLeft="xs" onClick={onPrev} />
    ) : undefined

    return (
        <Card absoluteFill>
            <CardLabel
                label={label}
                leftBarButton={leftBarButton}
                rightBarButton={rightBarButton}
                onClose={isRootPanel ? undefined : onClose}
            />
            <PanelContent {...boxProps} />
        </Card>
    )
}

const TouchPanel = (props: Props) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onClosed, rightBarButton, label, ...boxProps } = props
    const mountPoint = useZLayerContext().rootLayerRef?.current ?? undefined
    const [modalPresented, setModalPresented] = useState(false)
    const modalPresentable = props.modalPresentable ?? false

    const { isStacked, closePanel } = usePanelActions()

    const closeModal = useCallback(() => {
        setModalPresented(false)
        closePanel()
    }, [closePanel])

    const didCloseModal = useCallback(() => {
        onClosed?.()
        closePanel()
    }, [closePanel, onClosed])

    const onPanelBack = useCallback(() => {
        setModalPresented(false)
        setTimeout(() => {
            onClosed?.()
            closePanel() // SURE?
        }, transitions.panelAnimationDuration * 1000)
    }, [closePanel, onClosed])

    const onSheetBack = useCallback(() => {
        setModalPresented(false)
    }, [])

    useEffect(() => {
        setModalPresented(true)
    }, [])

    const touchPanelContext = useMemo<ContextType<typeof TouchPanelContext>>(
        () => ({
            triggerPanelClose: onPanelBack,
        }),
        [onPanelBack],
    )

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
                    <Sheet.Scroller>
                        <Box paddingX maxHeight="100svh" paddingBottom="safeAreaInsetBottom">
                            {props.children}
                        </Box>
                    </Sheet.Scroller>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={onSheetBack} />
        </Sheet>
    ) : (
        <TouchPanelContext.Provider value={touchPanelContext}>
            <AnimatePresence>
                {modalPresented && (
                    <ZLayerBox
                        layoutScroll
                        absoluteFill
                        initial={{ x: '100%' }}
                        animate={{ x: '0%' }}
                        exit={{ x: '100%' }}
                        transition={props.isRootPanel ? { duration: 0 } : transitions.panel}
                        background="level1"
                        zIndex="tooltips"
                        overflowX="hidden"
                    >
                        {/* this box makes sure the UI below doesn't bleed through while spring animating */}
                        <Box
                            background="level1"
                            style={{
                                position: 'absolute',
                                right: -100,
                                top: 0,
                                bottom: 0,
                                width: 100,
                            }}
                        />

                        {props.label && (
                            <TouchPanelNavigationBar
                                title={props.label}
                                rightBarButton={rightBarButton}
                                onBack={isStacked ? onPanelBack : undefined}
                            />
                        )}
                        {/* note: for vlist this following config would be ideal:  <Box grow overflow="hidden" position="relative"> */}
                        <PanelContent {...boxProps}>{props.children}</PanelContent>
                    </ZLayerBox>
                )}
            </AnimatePresence>
        </TouchPanelContext.Provider>
    )
}

export const TouchPanelContext = createContext({ triggerPanelClose: () => {} })

const PanelContent = (props: BoxProps) => <Stack grow scroll padding gap {...props} />
