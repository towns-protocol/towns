import React from 'react'
import { RenderPlaceholderProps } from 'slate-react'
import { Box, Text } from '@ui'

export const Placeholder = ({ children, attributes }: RenderPlaceholderProps) => {
    return (
        <Box {...attributes} paddingY="paragraph">
            <Text color="gray2">{children}</Text>
        </Box>
    )
}
