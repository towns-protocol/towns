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
            minWidth={{ touch: 'x3', default: 'x2' }}
            height={{ touch: 'x3', default: 'x2' }}
            padding="xs"
            fontWeight="strong"
            {...props}
        >
            <Paragraph size="xs">{value}</Paragraph>
        </Box>
    ),
)
