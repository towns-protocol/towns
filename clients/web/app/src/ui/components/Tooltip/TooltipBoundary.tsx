import React, { RefObject, createContext, useContext, useRef } from 'react'
import { Box, BoxProps } from '../Box/Box'

export const TooltipBoundaryContext = createContext<{
    ref: RefObject<HTMLDivElement>
    tooltipPadding?: number
} | null>(null)

export const useTooltipBoundaryContext = () => {
    // no throw so we can skip the boundary and fallback to document.body
    return useContext(TooltipBoundaryContext)
}

export const TooltipBoundaryBox = (props: BoxProps & { tooltipPadding?: number }) => {
    const ref = useRef<HTMLDivElement>(null)
    const { tooltipPadding = 16, ...boxProps } = props
    return (
        <TooltipBoundaryContext.Provider value={{ ref, tooltipPadding }}>
            <Box as="span" {...boxProps} ref={ref}>
                {props.children}
            </Box>
        </TooltipBoundaryContext.Provider>
    )
}
