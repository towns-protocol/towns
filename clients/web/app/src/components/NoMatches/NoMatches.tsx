import React from 'react'
import { Box, Icon, Paragraph } from '@ui'

export const NoMatches = ({ searchTerm }: { searchTerm: string }) => (
    <Box
        padding
        horizontal
        gap="sm"
        background="level2"
        height="x7"
        alignItems="center"
        rounded="sm"
        color="gray2"
    >
        <Icon type="alert" size="square_xs" />
        <Paragraph>No matches for &quot;{searchTerm}&quot;</Paragraph>
    </Box>
)
