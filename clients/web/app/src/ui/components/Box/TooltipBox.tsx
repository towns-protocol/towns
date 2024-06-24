import React, { forwardRef } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { TooltipOptions, TooltipRenderer } from '../Tooltip/TooltipRenderer'
import { Tooltip } from '../Tooltip/Tooltip'

type Props = {
    tooltip?: React.ReactNode
    tooltipOptions?: TooltipOptions
} & BoxProps

export type TooltipBoxProps = Props

export const TooltipBox = forwardRef<HTMLElement, Props>(
    ({ tooltip, tooltipOptions, onMouseEnter, onMouseLeave, ...boxProps }, ref) => {
        return tooltip ? (
            <TooltipRenderer
                tooltip={typeof tooltip === 'string' ? <Tooltip>{tooltip}</Tooltip> : tooltip}
                {...tooltipOptions}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {({ triggerProps }) => <Box {...boxProps} {...triggerProps} />}
            </TooltipRenderer>
        ) : (
            <Box {...boxProps} ref={ref} />
        )
    },
)
