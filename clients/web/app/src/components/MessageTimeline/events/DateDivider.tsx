import React from 'react'
import { Box } from '@ui'

export const DateDivider = (props: { label: string }) => (
    <>
        <Box left right top="md" position="absolute" paddingX="lg">
            <Box borderTop />
        </Box>
        <Box centerContent top="md" display="block" position="sticky" zIndex="ui">
            <Box centerContent>
                <Box
                    border
                    paddingY="sm"
                    paddingX="md"
                    rounded="md"
                    background="default"
                    color="gray2"
                    fontSize="sm"
                >
                    {props.label}
                </Box>
            </Box>
        </Box>
    </>
)
