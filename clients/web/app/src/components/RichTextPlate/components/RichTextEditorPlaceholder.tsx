import React from 'react'
import { Box } from '@ui'

export const RichTextPlaceholder = ({
    placeholder,
}: React.PropsWithChildren<{ placeholder: string }>) => {
    return (
        <Box absoluteFill pointerEvents="none" color="gray2" justifyContent="center" padding="md">
            <Box as="p">{placeholder}</Box>
        </Box>
    )
}
