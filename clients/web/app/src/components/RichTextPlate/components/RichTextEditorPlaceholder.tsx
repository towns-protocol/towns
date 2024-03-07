import React from 'react'
import { RenderPlaceholderProps } from 'slate-react'
import { Box } from '@ui'

export const RichTextPlaceholder = ({ children, attributes }: RenderPlaceholderProps) => {
    return (
        <Box
            absoluteFill
            pointerEvents="none"
            color="gray2"
            justifyContent="center"
            paddingY="md"
            {...attributes}
            style={{
                ...attributes.style,
                opacity: 1,
            }}
        >
            <Box as="p">{children}</Box>
        </Box>
    )
}
