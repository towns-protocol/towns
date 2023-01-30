import React from 'react'
import { BoxProps } from '../Box/Box'
import { IconButton } from '../IconButton/IconButton'
import { Stack } from '../Stack/Stack'

export const Panel = (props: {
    children: React.ReactNode
    label?: React.ReactNode | string
    paddingX?: BoxProps['padding']
    onClose?: () => void
}) => {
    const { paddingX = 'md' } = props
    return (
        <Stack overflow="scroll" maxHeight="100%">
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
