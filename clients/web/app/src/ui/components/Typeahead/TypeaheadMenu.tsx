import React from 'react'
import { Box, BoxProps } from '../Box/Box'

export const TypeaheadMenu = ({
    children,
    zIndex,
    outerBorder = true,
}: {
    children: React.ReactNode
    zIndex?: BoxProps['zIndex']
    outerBorder?: boolean
}) => {
    return (
        <Box border={outerBorder} position="relative" zIndex={zIndex}>
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
                {children}
            </Box>
        </Box>
    )
}
