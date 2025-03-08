import React from 'react'
import { Box, Icon, Text } from '@ui'

export const TickerChangeIndicator = ({ change }: { change: number }) => (
    <Box
        horizontal
        alignItems="center"
        gap="xs"
        paddingX="sm"
        paddingY="xs"
        rounded="md"
        insetBottom="xxs"
        background={change > 0 ? 'positiveSubtle' : 'peachSubtle'}
        color={change > 0 ? 'positive' : 'peach'}
    >
        <Icon size="square_xxs" type={change > 0 ? 'arrowSmallUp' : 'arrowSmallDown'} />
        <Text fontWeight="strong" size="sm">
            {Math.abs(change).toFixed(2)}%
        </Text>
    </Box>
)
