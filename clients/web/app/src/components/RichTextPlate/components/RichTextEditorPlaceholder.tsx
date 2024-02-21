import React from 'react'
import { RenderPlaceholderProps } from 'slate-react'
import { Box, Paragraph } from '@ui'

export const RichTextPlaceholder = ({ children, attributes }: RenderPlaceholderProps) => (
    <Box
        absoluteFill
        pointerEvents="none"
        color="gray2"
        justifyContent="center"
        paddingY="md"
        {...attributes}
    >
        <Paragraph truncate>{children}</Paragraph>
    </Box>
)
