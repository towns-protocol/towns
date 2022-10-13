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
            background="level3"
            padding="xs"
            rounded="full"
            square="square_inline"
            fontSize="sm"
            {...props}
        >
            {value}
        </Box>
    ),
)
