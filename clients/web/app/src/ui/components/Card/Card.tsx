import React, { forwardRef } from 'react'
import { Stack, StackProps } from '../Stack/Stack'
import { ArrowHead } from './CardArrowHead'

type Props = {
    arrow?: boolean
} & StackProps

export const Card = forwardRef<HTMLDivElement, Props>(({ children, arrow, ...boxProps }, ref) => {
    return (
        <>
            {arrow && <ArrowHead />}
            <Stack
                ref={ref}
                background="level2"
                borderRadius="md"
                overflow="hidden"
                position="relative"
                boxShadow="card"
                {...boxProps}
            >
                {children}
            </Stack>
        </>
    )
})
