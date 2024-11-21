import React from 'react'
import { vars } from 'ui/styles/vars.css'
import { Box, BoxProps } from '../Box/Box'

type Props = BoxProps & {
    columns?: number
    columnMinSize?: string
    columnMaxSize?: string
    autoFit?: boolean
}

export const Grid = (props: Props) => {
    const {
        columns,
        columnMinSize,
        columnMaxSize = '1fr',
        autoFit = false,
        children,
        gap = 'md',
        ...boxProps
    } = props

    const columnGap = typeof gap === 'string' ? gap : gap === true ? 'md' : 'none'

    const rowGap = typeof gap === 'string' ? gap : gap === true ? 'md' : 'none'

    return (
        <Box
            display="grid"
            style={{
                columnGap: vars.space[columnGap],
                rowGap: vars.space[rowGap],
                gridTemplateColumns: columns
                    ? `repeat(${columns}, 1fr)`
                    : `repeat(${
                          autoFit ? 'auto-fit' : 'auto-fill'
                      }, minmax(${columnMinSize}, ${columnMaxSize}))`,
            }}
            {...boxProps}
        >
            {children}
        </Box>
    )
}
