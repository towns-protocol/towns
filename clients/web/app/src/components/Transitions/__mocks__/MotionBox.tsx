import React from 'react'
import { Box } from 'ui/components/Box/Box'
import { Stack } from 'ui/components/Stack/Stack'

export const MotionBox = React.forwardRef<
    HTMLDivElement,
    { children: React.ReactNode; layout?: string }
>(({ children, layout, ...props }, ref) => {
    return (
        <Box ref={ref} {...props}>
            {children}
        </Box>
    )
})

export const MotionStack = React.forwardRef<
    HTMLDivElement,
    { children: React.ReactNode; layout?: string }
>(({ children, layout, ...props }, ref) => {
    return (
        <Stack ref={ref} {...props}>
            {children}
        </Stack>
    )
})
