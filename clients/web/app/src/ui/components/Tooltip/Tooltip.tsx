import React, { useContext } from 'react'
import { clsx } from 'clsx'
import { atoms } from 'ui/styles/atoms.css'
import { useDevice } from 'hooks/useDevice'
import { Box, BoxProps } from '../Box/Box'
import * as style from './Tooltip.css'
import { TooltipContext } from './TooltipRenderer'

export const Tooltip = ({ children, ...boxProps }: { children: React.ReactNode } & BoxProps) => {
    const tooltipContext = useContext(TooltipContext)
    const arrowDirection =
        tooltipContext.placement === 'horizontal' ? style.tooltipRight : style.tooltipBottom
    const { pointerEvents = 'none' } = boxProps
    const { isTouch } = useDevice()

    if (isTouch) {
        return null
    }

    children =
        typeof children === 'string' ? (
            <p className={atoms({ fontSize: 'sm' })}>{children}</p>
        ) : (
            children
        )
    return (
        <Box
            padding="sm"
            background="level1"
            color="gray1"
            rounded="sm"
            className={clsx(style.tooltip, style.arrow, arrowDirection)}
            fontSize="sm"
            {...boxProps}
            pointerEvents={pointerEvents}
        >
            {children}
        </Box>
    )
}
