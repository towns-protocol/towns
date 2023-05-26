import React, { useCallback, useEffect, useState } from 'react'
import Sheet from 'react-modal-sheet'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { useDevice } from 'hooks/useDevice'
import { Box, BoxProps } from '../Box/Box'
import { IconButton } from '../IconButton/IconButton'
import { Stack } from '../Stack/Stack'
import { Text } from '../Text/Text'

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
        <Stack overflow="scroll" height="100%" background="level1">
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
        <Stack absoluteFill background="level1" zIndex="tooltips">
            <Stack
                horizontal
                borderBottom
                gap="sm"
                padding="sm"
                alignItems="center"
                color="gray1"
                position="sticky"
                background="level1"
                paddingTop="safeAreaInsetTop"
            >
                <IconButton icon="back" color="gray2" size="square_sm" onClick={props.onClose} />
                <Text fontWeight="strong">{props.label}</Text>
            </Stack>
            <Stack scroll>
                <Box
                    minHeight="100svh"
                    paddingTop="safeAreaInsetTop"
                    paddingBottom="safeAreaInsetBottom"
                >
                    {props.children}
                </Box>
            </Stack>
        </Stack>
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
