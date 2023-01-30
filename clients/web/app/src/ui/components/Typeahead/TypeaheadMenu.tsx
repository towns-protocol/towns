import React from 'react'
import { Box } from '../Box/Box'

export const TypeaheadMenu = (props: { children: React.ReactNode }) => {
    return (
        <Box border position="relative">
            <Box
                border
                bottom="x4"
                overflow="scroll"
                position="absolute"
                rounded="sm"
                minWidth="250"
                maxHeight="200"
                as="ul"
                paddingY="xs"
                background="level2"
            >
                {props.children}
            </Box>
        </Box>
    )
}
