import React, { forwardRef } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { Paragraph } from '../Text/Paragraph'

type Props = {
    value?: string | number | JSX.Element | false
}

export const Badge = forwardRef<typeof Box, BoxProps & Props>(({ value, ...props }, ref) =>
    !value ? (
        <></>
    ) : (
        <Box
            centerContent
            background="accent"
            rounded="full"
            minWidth="x2"
            height="x2"
            fontWeight="strong"
            {...props}
        >
            <Paragraph size="xs">{value}</Paragraph>
        </Box>
    ),
)
