import React from 'react'
import { Box, Paragraph } from '@ui'

export const ChannelNavGroup = (props: { label: string; children?: React.ReactNode }) => (
    <Box
        horizontal
        alignItems="center"
        justifyContent="spaceBetween"
        paddingRight="sm"
        height="height_lg"
    >
        <Box style={{ transform: 'translateY(2px)' }}>
            <Label>{props.label}</Label>
        </Box>
        {props.children}
    </Box>
)

const Label = (props: { children: React.ReactNode }) => (
    <Box paddingX="md" paddingY="sm">
        <Paragraph color="gray2">{props.children}</Paragraph>
    </Box>
)
