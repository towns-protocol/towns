import React, { useCallback, useEffect, useState } from 'react'
import Sheet from 'react-modal-sheet'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { useDevice } from 'hooks/useDevice'
import { Box, BoxProps } from '../Box/Box'
import { IconButton } from '../IconButton/IconButton'
import { Stack } from '../Stack/Stack'

type Props = {
    children: React.ReactNode
    label?: React.ReactNode | string
    paddingX?: BoxProps['padding']
    modalPresentable?: boolean
    onClose?: () => void
}

export const Panel = (props: Props) => {
    const { isMobile } = useDevice()
    return isMobile ? MobilePanel(props) : DesktopPanel(props)
}

const DesktopPanel = (props: Props) => {
    const { paddingX = 'md' } = props
    return (
        <Stack overflow="scroll" height="100%">
            <Stack
                horizontal
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
            </Stack>
            {props.children}
        </Stack>
    )
}

const MobilePanel = (props: Props) => {
    const { onClose } = props
    const [modalPresented, setModalPresented] = useState(false)
    const modalPresentable = props.modalPresentable ?? false

    const closeModal = useCallback(() => {
        setModalPresented(false)
    }, [])

    const didCloseModal = useCallback(() => {
        onClose?.()
    }, [onClose])

    useEffect(() => {
        setModalPresented(true)
    }, [])

    return modalPresentable ? (
        <Sheet
            className={modalSheetClass}
            isOpen={modalPresented}
            detent="content-height"
            onClose={closeModal}
            onCloseEnd={didCloseModal}
        >
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content>
                    <div
                        style={{
                            maxHeight: '100svh',
                            overflow: 'auto',
                        }}
                    >
                        {props.children}
                    </div>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={closeModal} />
        </Sheet>
    ) : (
        // TODO: sort out zIndexes
        <Stack absoluteFill background="level2" zIndex="tooltips" insetTop="safeArea">
            <Stack
                gap
                horizontal
                padding
                alignItems="center"
                color="gray1"
                position="sticky"
                background="level1"
            >
                <IconButton icon="close" onClick={props.onClose} />
                {props.label}
            </Stack>
            <Stack scroll>
                <Box minHeight="100svh">{props.children}</Box>
            </Stack>
        </Stack>
    )
}
