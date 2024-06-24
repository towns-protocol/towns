import React, { forwardRef } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { TooltipOptions, TooltipRenderer } from '../Tooltip/TooltipRenderer'
import { Tooltip } from '../Tooltip/Tooltip'

type Props = {
    tooltip?: React.ReactNode
    tooltipOptions?: TooltipOptions
} & BoxProps

export type TooltipBoxProps = Props

export const TooltipBox = forwardRef<HTMLElement, Props>((props, ref) => {
    if (!props.tooltip) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tooltip, tooltipOptions, ...boxProps } = props
        return <Box {...boxProps} ref={ref} />
    } else {
        const { tooltip, tooltipOptions, onMouseEnter, onMouseLeave, ...boxProps } = props
        return (
            <TooltipRenderer
                tooltip={typeof tooltip === 'string' ? <Tooltip>{tooltip}</Tooltip> : tooltip}
                {...tooltipOptions}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {({ triggerProps }) => <Box {...boxProps} {...triggerProps} />}
            </TooltipRenderer>
        )
    }
})
