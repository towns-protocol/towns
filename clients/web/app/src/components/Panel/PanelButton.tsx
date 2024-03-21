import React from 'react'
import { Box, BoxProps } from '@ui'

export const PanelButton = ({
    tone,
    ...props
}: Omit<BoxProps, 'color'> & { tone?: 'negative' | 'positive' }) => (
    <Box
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
