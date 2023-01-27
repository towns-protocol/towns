import React from 'react'
import { IconButton, Stack } from '@ui'

export const Panel = (props: {
    children: React.ReactNode
    label?: React.ReactNode | string
    onClose?: () => void
}) => {
    return (
        <Stack overflow="hidden" maxHeight="100%">
            <Stack
                horizontal
                shrink
                paddingX="md"
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
