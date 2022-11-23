import React, { forwardRef } from 'react'
import { Box, BoxProps } from '@ui'

type Props = {
    value?: string | number | JSX.Element | false
}

export const Badge = forwardRef<typeof Box, BoxProps & Props>(({ value, ...props }, ref) =>
    !value ? (
        <></>
    ) : (
        <Box
            centerContent
            background="level2"
            padding="sm"
            rounded="full"
            minWidth="x3"
            height="x3"
            fontSize="sm"
            fontWeight="strong"
            {...props}
        >
            {value}
        </Box>
    ),
)
