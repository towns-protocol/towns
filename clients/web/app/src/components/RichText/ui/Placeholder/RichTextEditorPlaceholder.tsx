import React from 'react'
import { Box, BoxProps, Paragraph } from '@ui'

type Props = {
    placeholder: string
    color?: BoxProps['color']
}

export const RichTextPlaceholder = ({ color = 'gray2', placeholder }: Props) => (
    <Box absoluteFill pointerEvents="none" color={color} justifyContent="center" padding="md">
        <Paragraph>{placeholder}</Paragraph>
    </Box>
)
