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
                padding="md"
                background="level2"
                minHeight="x8"
                alignItems="center"
                color="gray1"
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
