import React from 'react'
import { Box } from 'ui/components/Box/Box'
import { Stack } from 'ui/components/Stack/Stack'

// prevent passing down motion related props to React elements to avoid warnings
const clearMotionProps = (props: { [key: string]: unknown }) => {
    delete props.whileHover
}

export const MotionBox = React.forwardRef<
    HTMLDivElement,
    { children: React.ReactNode; layout?: string }
>(({ children, layout, ...props }, ref) => {
    clearMotionProps(props)
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
    clearMotionProps(props)
    return (
        <Stack ref={ref} {...props}>
            {children}
        </Stack>
    )
})
