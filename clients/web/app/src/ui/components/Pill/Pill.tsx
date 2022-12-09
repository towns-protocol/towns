import React, { Ref, forwardRef } from 'react'
import { Box, BoxProps } from '../Box/Box'

type Pill = {
    children: React.ReactNode | React.ReactNode[] | string
} & BoxProps

export const Pill = forwardRef((props: Pill, ref: Ref<HTMLElement> | undefined) => {
    const { children, ...boxProps } = props
    return (
        <Box
            background="level3"
            padding="xs"
            display="inline-block"
            rounded="sm"
            ref={ref}
            {...boxProps}
        >
            {children}
        </Box>
    )
})
