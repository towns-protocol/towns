import React from 'react'
import { useDevice } from 'hooks/useDevice'
import { Box, BoxProps } from '../Box/Box'
import { IconButton } from '../IconButton/IconButton'
import { Stack } from '../Stack/Stack'

type Props = {
    children: React.ReactNode
    label?: React.ReactNode | string
    paddingX?: BoxProps['padding']
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
    return (
        // TODO: sort out zIndexes
        <Stack absoluteFill background="level2" zIndex="tooltips">
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
